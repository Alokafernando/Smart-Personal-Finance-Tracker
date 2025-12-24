import { Request, Response } from "express"
import mongoose from "mongoose"
import { Budget } from "../model/budget.model"
import { AuthRequest } from "../middleware/auth"

// Create budget
export const createBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.sub
    const { category_id, amount, month, year, spent } = req.body

    if (!category_id || !amount || !month || !year) {
      return res.status(400).json({ message: "All fields are required" })
    }

    const exists = await Budget.findOne({
      user_id: userId,
      category_id,
      month,
      year,
    })

    if (exists) {
      return res.status(400).json({
        message: `Budget already exists for this category/${month}/${year}`,
      })
    }

    const budget = new Budget({
      user_id: userId,
      category_id,
      amount,
      month,
      year,
      spent: spent ?? 0, // default 0
    })

    await budget.save()

    return res.status(201).json({
      message: "Budget created successfully",
      data: budget,
    })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ message: err.message })
  }
}

// Get all budgets for a user
export const getBudgets = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.sub

    const budgets = await Budget.find({ user_id: userId }).populate(
      "category_id"
    )// populate category details

    return res.status(200).json({ budgets })
  } catch (err: any) {
    return res.status(500).json({ message: err.message })
  }
}

// Update a budget
export const updateBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.sub
    const budgetId = req.params.id
    const { amount, month, year, spent, category_id } = req.body

    if (!mongoose.isValidObjectId(budgetId)) {
      return res.status(400).json({ message: "Invalid budget ID" })
    }

    const budget = await Budget.findById(budgetId)

    if (!budget) {
      return res.status(404).json({ message: "Budget not found" })
    }

    if (budget.user_id.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" })
    }

    // Duplicate check using new category_id
    const duplicate = await Budget.findOne({
      _id: { $ne: budgetId },
      user_id: userId,
      category_id: category_id ?? budget.category_id,
      month: month ?? budget.month,
      year: year ?? budget.year,
    })

    if (duplicate) {
      return res.status(400).json({
        message: `Budget already exists for this category/${month ?? budget.month}/${year ?? budget.year}`,
      })
    }

    // Update fields
    budget.category_id = category_id ?? budget.category_id
    budget.amount = amount ?? budget.amount
    budget.month = month ?? budget.month
    budget.year = year ?? budget.year
    budget.spent = spent ?? budget.spent

    await budget.save()

    return res.status(200).json({
      message: "Budget updated successfully",
      data: budget,
    })
  } catch (err: any) {
    return res.status(500).json({ message: err.message })
  }
}

// Delete a budget
export const deleteBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.sub
    const budgetId = req.params.id

    if (!mongoose.isValidObjectId(budgetId)) {
      return res.status(400).json({ message: "Invalid budget ID" })
    }

    const budget = await Budget.findById(budgetId)

    if (!budget) {
      return res.status(404).json({ message: "Budget not found" })
    }

    if (budget.user_id.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" })
    }

    await budget.deleteOne()

    return res.status(200).json({ message: "Budget deleted successfully" })
  } catch (err: any) {
    return res.status(500).json({ message: err.message })
  }
}

export const getLatestBudgets = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.sub

    const budgets = await Budget.find({ user_id: userId })
      .populate("category_id") // include category details
      .sort({ createdAt: -1 }) // latest first
      .limit(5)

    return res.status(200).json({ budgets })
  } catch (err: any) {
    return res.status(500).json({ message: err.message })
  }
}

export const getAllBudgets = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = 10
    const skip = (page - 1) * limit

    const searchUser = (req.query.searchUser as string) || ""
    const categoryFilter = (req.query.category as string) || "ALL"
    const statusFilter = (req.query.status as string) || "ALL" // OVER / OK / ALL

    const query: any = {}

    // ================= Category filter =================
    if (categoryFilter !== "ALL") {
      query.category_id = categoryFilter
    }

    // ================= User search =================
    let totalCount = 0
    let usersBudgets: any[] = []

    if (searchUser) {
      // Use aggregation to filter by username/email
      const totalAgg = await Budget.aggregate([
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
            ...query,
            $or: [
              { "user.username": { $regex: searchUser, $options: "i" } },
              { "user.email": { $regex: searchUser, $options: "i" } },
            ],
          },
        },
        { $count: "total" },
      ])
      totalCount = totalAgg[0]?.total || 0

      // Get paginated budgets with user and category populated
      const budgetsAgg = await Budget.aggregate([
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
          $lookup: {
            from: "categories",
            localField: "category_id",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        {
          $match: {
            ...query,
            $or: [
              { "user.username": { $regex: searchUser, $options: "i" } },
              { "user.email": { $regex: searchUser, $options: "i" } },
            ],
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ])

      usersBudgets = budgetsAgg
    } else {
      // ================= No user search =================
      totalCount = await Budget.countDocuments(query)

      usersBudgets = await Budget.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user_id", "username email")
        .populate("category_id", "name")
    }

    // ================= Format response grouped by user =================
    const usersMap: Record<string, any> = {}
    usersBudgets.forEach((b) => {
      const userId = b.user_id._id.toString()
      const isOver = b.spent > b.amount

      // Status filter
      if (statusFilter === "OVER" && !isOver) return
      if (statusFilter === "OK" && isOver) return

      if (!usersMap[userId]) {
        usersMap[userId] = {
          userId,
          username: b.user_id.username,
          email: b.user_id.email,
          budgets: [],
        }
      }
      usersMap[userId].budgets.push({
        category: b.category_id.name,
        limit: b.amount,
        spent: b.spent,
      })
    })

    const users = Object.values(usersMap)

    res.status(200).json({
      success: true,
      page,
      totalPages: Math.ceil(totalCount / limit),
      totalBudgets: totalCount,
      users,
    })
  } catch (error) {
    console.error("Error fetching budgets:", error)
    res.status(500).json({ success: false, message: "Failed to fetch budgets" })
  }
}