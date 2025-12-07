import { Request, Response } from "express"
import mongoose from "mongoose"
import { Budget } from "../model/budget.model"
import { AuthRequest } from "../middleware/auth"

// Create budget
export const createBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.sub
    const { category_id, amount, month, year } = req.body

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

