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
    const { amount, month, year, spent } = req.body

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

    const duplicate = await Budget.findOne({
      _id: { $ne: budgetId },
      user_id: userId,
      category_id: budget.category_id,
      month: month ?? budget.month,
      year: year ?? budget.year,
    })

    if (duplicate) {
      return res.status(400).json({
        message: `Budget already exists for this category/${month}/${year}`,
      })
    }

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
