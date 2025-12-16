import { Request, Response } from "express"
import mongoose from "mongoose"
import { Transaction } from "../model/transaction.model"
import { Category } from "../model/category.model"
import { Budget } from "../model/budget.model"
import { AuthRequest } from "../middleware/auth"


const getYearMonth = (date: Date | string) => {
    const d = new Date(date)
    return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
    }
}

export const createTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { category_id, amount, date, type, note, merchant, raw_text, ai_category } = req.body
        const userId = req.user?.sub

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        if (!category_id || !amount || !date || !type) {
            return res.status(400).json({ message: "Missing required fields" })
        }

        const category = await Category.findOne({
            _id: category_id,
            $or: [{ user_id: userId }, { is_default: true }],
        })

        if (!category) {
            return res.status(404).json({ message: "Category not found" })
        }

        const transaction = await Transaction.create({
            user_id: userId,
            category_id,
            amount,
            date,
            type,
            note,
            merchant,
            raw_text,
            ai_category,
        })

        /* -------- Budget update  -------- */
        if (type === "EXPENSE" || type === "INCOME") {
            const { year, month } = getYearMonth(date)

            await Budget.findOneAndUpdate(
                {
                    user_id: new mongoose.Types.ObjectId(userId),
                    category_id: new mongoose.Types.ObjectId(category_id),
                    year,
                    month,
                },
                {
                    $inc: { spent: amount },
                }
            )
        }

        return res.status(201).json({
            message: "Transaction created successfully",
            transaction,
        })
    } catch (err: any) {
        console.error("Create Transaction Error:", err)
        return res.status(500).json({ message: err.message || "Server error" })
    }
}

export const getTransactionById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid transaction ID" })
        }

        const trx = await Transaction.findById(id)
        if (!trx) return res.status(404).json({ message: "Transaction not found" })

        return res.json(trx)
    } catch (err) {
        return res.status(500).json({ message: "Error fetching transaction" })
    }
}

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const { user_id, category_id, type, startDate, endDate } = req.query

        const filter: any = {}

        if (user_id) filter.user_id = user_id
        if (category_id) filter.category_id = category_id
        if (type) filter.type = type

        if (startDate || endDate) {
            filter.date = {}
            if (startDate) filter.date.$gte = new Date(startDate as string)
            if (endDate) filter.date.$lte = new Date(endDate as string)
        }

        const transactions = await Transaction.find(filter).sort({ date: -1 })
        return res.json(transactions)
    } catch (err) {
        console.error("Get Transactions Error:", err)
        return res.status(500).json({ message: "Error fetching transactions" })
    }
}

export const updateTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { category_id, amount, note, date } = req.body

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid transaction ID" })
        }

        const trx = await Transaction.findById(id)
        if (!trx) return res.status(404).json({ message: "Transaction not found" })

        const oldAmount = trx.amount
        const oldCategory = trx.category_id
        const oldDate = trx.date

        if (category_id) trx.category_id = category_id
        if (amount !== undefined) trx.amount = amount
        if (note !== undefined) trx.note = note
        if (date) trx.date = date

        await trx.save()

        /* -------- Budget recalculation -------- */
        if (trx.type === "EXPENSE" || trx.type === "INCOME") {
            const oldYM = getYearMonth(oldDate)
            const newYM = getYearMonth(trx.date)

            // Remove old spent
            await Budget.findOneAndUpdate(
                {
                    user_id: trx.user_id,
                    category_id: oldCategory,
                    year: oldYM.year,
                    month: oldYM.month,
                },
                { $inc: { spent: -oldAmount } }
            )

            // Add new spent
            await Budget.findOneAndUpdate(
                {
                    user_id: trx.user_id,
                    category_id: trx.category_id,
                    year: newYM.year,
                    month: newYM.month,
                },
                { $inc: { spent: trx.amount } }
            )
        }

        return res.json({
            message: "Transaction updated successfully",
            transaction: trx,
        })
    } catch (err) {
        console.error("Update Error:", err)
        return res.status(500).json({ message: "Error updating transaction" })
    }
}

export const deleteTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid transaction ID" })
        }

        const trx = await Transaction.findById(id)
        if (!trx) return res.status(404).json({ message: "Transaction not found" })

        if (trx.type === "EXPENSE" || trx.type === "INCOME") {
            const { year, month } = getYearMonth(trx.date)

            await Budget.findOneAndUpdate(
                {
                    user_id: trx.user_id,
                    category_id: trx.category_id,
                    year,
                    month,
                },
                { $inc: { spent: -trx.amount } }
            )
        }

        await trx.deleteOne()

        return res.json({ message: "Transaction deleted successfully" })
    } catch (err) {
        console.error("Delete Error:", err)
        return res.status(500).json({ message: "Error deleting transaction" })
    }
}
