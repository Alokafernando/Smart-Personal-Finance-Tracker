import { Request, Response } from "express"
import mongoose from "mongoose"
import { Transaction } from "../model/transaction.model"

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

    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
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
          from: "categories", // your collection name
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

