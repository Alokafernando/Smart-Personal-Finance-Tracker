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

