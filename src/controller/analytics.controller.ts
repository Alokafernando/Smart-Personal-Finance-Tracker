import { Request, Response } from "express"
import mongoose from "mongoose"
import { Transaction } from "../model/transaction.model"
import { AuthRequest } from "../middleware/auth"
import { User } from "../model/user.model"

export const getSummaryAnalytics = async (req: any, res: Response) => {
  try {
    const userId = req.user.sub

    const result = await Transaction.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ])

    let income = 0
    let expense = 0

    result.forEach(r => {
      if (r._id === "INCOME") income = r.total
      if (r._id === "EXPENSE") expense = r.total
    })

    res.json({
      income,
      expense,
      balance: income - expense,
      savingsRate: income
        ? (((income - expense) / income) * 100).toFixed(1)
        : "0",
    })
  } catch (err) {
    res.status(500).json({ message: "Summary analytics failed", err })
  }
}

export const getMonthlyAnalytics = async (req: any, res: Response) => {
  try {
    const userId = req.user.sub

    const data = await Transaction.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: {
            month: { $month: "$date" },
            year: { $year: "$date" },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
    ])

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const map: any = {}

    data.forEach(d => {
      const m = months[d._id.month - 1]
      if (!map[m]) map[m] = { month: m, income: 0, expense: 0 }

      if (d._id.type === "INCOME") map[m].income = d.total
      else map[m].expense = d.total
    })

    res.json(Object.values(map))
  } catch (err) {
    res.status(500).json({ message: "Monthly analytics failed", err })
  }
}

export const getCategoryAnalytics = async (req: any, res: Response) => {
  try {
    const userId = req.user.sub

    const data = await Transaction.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(userId),
          type: "EXPENSE",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category_id",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$category.name",
          value: { $sum: "$amount" },
        },
      },
      { $sort: { value: -1 } },
    ])

    res.json(
      data.map(d => ({
        name: d._id || "Unknown",
        value: d.value,
      }))
    )
  } catch (err) {
    res.status(500).json({ message: "Category analytics failed", err })
  }
}

export const getFilteredAnalyticsByMonthOrYear = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.sub
    const { month, year, type, category } = req.body

    const filter: any = {
      user_id: new mongoose.Types.ObjectId(userId),
    }

    if (type) filter.type = type
    if (category) filter.ai_category = category

    const currentYear = new Date().getFullYear()

    if (month && year) {
      filter.date = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59, 999),
      }
    } else if (month && !year) {
      filter.date = {
        $gte: new Date(currentYear, month - 1, 1),
        $lte: new Date(currentYear, month, 0, 23, 59, 59, 999),
      }
    } else if (year && !month) {
      filter.date = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year, 11, 31, 23, 59, 59, 999),
      }
    }

    const transactions = await Transaction.find(filter)

    const income = transactions
      .filter(t => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0)

    const expense = transactions
      .filter(t => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0)

    const balance = income - expense
    const savingsRate = income ? (balance / income) * 100 : 0

    const monthlyData = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          income: {
            $sum: { $cond: [{ $eq: ["$type", "INCOME"] }, "$amount", 0] },
          },
          expense: {
            $sum: { $cond: [{ $eq: ["$type", "EXPENSE"] }, "$amount", 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ])

    const formattedMonthly = monthlyData.map(d => ({
      month: `${d._id.year}-${String(d._id.month).padStart(2, "0")}`,
      income: d.income,
      expense: d.expense,
    }))

    const categoryData = await Transaction.aggregate([
      {
        $match: {
          ...filter,
          type: "EXPENSE",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category_id",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$category.name",
          value: { $sum: "$amount" },
        },
      },
      { $sort: { value: -1 } },
    ])

    const formattedCategory = categoryData.map(d => ({
      name: d._id || "Other",
      value: d.value,
    }))

    res.json({
      summary: { income, expense, balance, savingsRate },
      monthly: formattedMonthly,
      categories: formattedCategory,
    })
  } catch (error) {
    res.status(500).json({ message: "Server error", error })
  }
}

//===================== admin ==========================

export const getAnalyticsSummaryForAdmin = async (req: Request, res: Response) => {
  try {
    const aggregation = await Transaction.aggregate([
      {
        $group: {
          _id: "$type",
          totalAmount: { $sum: "$amount" },
        },
      },
    ])

    let totalIncome = 0
    let totalExpense = 0

    aggregation.forEach((item) => {
      if (item._id === "INCOME") totalIncome = item.totalAmount
      if (item._id === "EXPENSE") totalExpense = item.totalAmount
    })

    const netBalance = totalIncome - totalExpense

    res.status(200).json({
      totalIncome,
      totalExpense,
      netBalance,
    })
  } catch (err: any) {
    console.error("Analytics Summary Error:", err)
    res.status(500).json({ message: err.message })
  }
}

export const getMonthlyAnalyticsForAdmin = async (req: Request, res: Response) => {
  try {
    const monthlySummary = await Transaction.aggregate([
      {
        $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" } },
          totalIncome: {
            $sum: { $cond: [{ $eq: ["$type", "INCOME"] }, "$amount", 0] },
          },
          totalExpense: {
            $sum: { $cond: [{ $eq: ["$type", "EXPENSE"] }, "$amount", 0] },
          },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
      {
        $project: {
          year: "$_id.year",
          month: "$_id.month",
          totalIncome: 1,
          totalExpense: 1,
          netBalance: { $subtract: ["$totalIncome", "$totalExpense"] },
          _id: 0,
        },
      },
    ])

    res.status(200).json({
      data: monthlySummary,
    })
  } catch (err: any) {
    console.error("Monthly Analytics Error:", err)
    res.status(500).json({ message: err.message })
  }
}

export const getTopCategories = async (req: Request, res: Response) => {
  try {
    const type = (req.query.type as string) || "EXPENSE" // default EXPENSE
    const limit = parseInt(req.query.limit as string) || 5

    const topCategories = await Transaction.aggregate([
      { $match: { type } },
      {
        $group: {
          _id: "$category_id",
          totalAmount: { $sum: "$amount" },
        },
      },
      { $sort: { totalAmount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $project: {
          categoryId: "$category._id",
          name: "$category.name",
          totalAmount: 1,
          _id: 0,
        },
      },
    ])

    res.status(200).json({
      data: topCategories,
    })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ message: err.message })
  }
}

export const getUsersSummary = async (req: Request, res: Response) => {
  try {
    const now = new Date()

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // ❌ Exclude ADMIN
    const userFilter = { role: { $ne: "ADMIN" } }

    // Total users (NON-ADMIN)
    const totalUsers = await User.countDocuments(userFilter)

    // New users this month (NON-ADMIN)
    const newUsers = await User.countDocuments({
      ...userFilter,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    })

    // Active users = users who have at least 1 transaction AND are not ADMIN
    const activeUsersAgg = await Transaction.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $match: {
          "user.role": { $ne: "ADMIN" },
        },
      },
      {
        $group: {
          _id: "$user._id",
        },
      },
      {
        $count: "count",
      },
    ])

    const activeUsers = activeUsersAgg[0]?.count || 0

    res.status(200).json({
      success: true,
      totalUsers,
      newUsers,
      activeUsers,
    })
  } catch (error: any) {
    console.error("Users Summary Error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch users summary",
    })
  }
}
