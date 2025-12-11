import { Request, Response } from "express"
import { Transaction } from "../model/transaction.model"
import { AuthRequest } from "../middleware/auth"
import { Category } from "../model/category.model"

export const createTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { category_id, amount, date, type, note, merchant, raw_text, ai_category } = req.body

        const userId = req.user?.sub

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: No user found" })
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

        const newTransaction = new Transaction({
            user_id: userId,
            category_id,
            amount,
            date,
            type,
            note,
            merchant,
            raw_text,
            ai_category
        })

        await newTransaction.save()

        return res.status(201).json({
            message: "Transaction created successfully",
            transaction: newTransaction,
        })

    } catch (err: any) {
        console.error("Create Transaction Error:", err)
        return res.status(500).json({ message: err.message || "Server error" })
    }
}


export const getTransactionById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

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
    } catch (err: any) {
        console.error("Get Transactions Error:", err)
        return res.status(500).json({ message: err })
    }
}

export const updateTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        const updated = await Transaction.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true
        })

        if (!updated) return res.status(404).json({ message: "Transaction not found" })

        return res.json(updated)
    } catch (err) {
        console.error("Update Error:", err)
        return res.status(500).json({ message: "Error updating transaction" })
    }
}

export const deleteTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        const deleted = await Transaction.findByIdAndDelete(id)
        if (!deleted) return res.status(404).json({ message: "Transaction not found" })

        return res.json({ message: "Transaction deleted successfully" })
    } catch (err) {
        console.error("Delete Error:", err)
        return res.status(500).json({ message: "Error deleting transaction" })
    }
}
