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

// export const createTransaction = async (req: AuthRequest, res: Response) => {
//   try {
//     const { category_id, amount, date, type, note, merchant, raw_text, ai_category } = req.body
//     const userId = req.user?.sub

//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized" })
//     }

//     if (!category_id || !amount || !date || !type) {
//       return res.status(400).json({ message: "Missing required fields" })
//     }

//     const category = await Category.findOne({
//       _id: category_id,
//       $or: [{ user_id: userId }, { is_default: true }],
//     })

//     if (!category) {
//       return res.status(404).json({ message: "Category not found" })
//     }

//     const transaction = await Transaction.create({
//       user_id: userId,
//       category_id,
//       amount,
//       date,
//       type,
//       note,
//       merchant,
//       raw_text,
//       ai_category,
//     })

//     /* -------- Budget update  -------- */
//     if (type === "EXPENSE" || type === "INCOME") {
//       const { year, month } = getYearMonth(date)
//       const numericAmount = Number(amount)

//       // Only update if budget exists
//       const budget = await Budget.findOne({
//         user_id: new mongoose.Types.ObjectId(userId),
//         category_id: new mongoose.Types.ObjectId(category_id),
//         year,
//         month,
//       })

//       if (budget) {
//         budget.spent += numericAmount
//         await budget.save()
//       }
//     }

//     return res.status(201).json({
//       message: "Transaction created successfully",
//       transaction,
//     })
//   } catch (err: any) {
//     console.error("Create Transaction Error:", err)
//     return res.status(500).json({ message: err.message || "Server error" })
//   }
// }
export const createTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { category_id, amount, date, type, note, merchant, raw_text, ai_category } = req.body;
    const userId = req.user?.sub;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!category_id || !amount || !date || !type)
      return res.status(400).json({ message: "Missing required fields" });

    const category = await Category.findOne({
      _id: category_id,
      $or: [{ user_id: userId }, { is_default: true }],
    });

    if (!category) return res.status(404).json({ message: "Category not found" });

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
    });

    // Update budget spent automatically
    if (type === "EXPENSE" || type === "INCOME") {
      const numericAmount = Number(amount);
      const budget = await Budget.findOne({ user_id: userId, category_id });

      if (budget) {
        budget.spent += numericAmount;
        await budget.save();
      }
    }

    return res.status(201).json({ message: "Transaction created successfully", transaction });
  } catch (err: any) {
    console.error("Create Transaction Error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};


export const getTransactionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid transaction ID" })
    }

    const obj = await Transaction.findById(id)
    if (!obj) return res.status(404).json({ message: "Transaction not found" })

    return res.json(obj)
  } catch (err) {
    return res.status(500).json({ message: "Error fetching transaction" })
  }
}

export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user.sub
    const { category_id, type, startDate, endDate, page, search } = req.query

    const filter: any = {}

    // Basic filters
    if (user_id) filter.user_id = user_id
    if (category_id) filter.category_id = category_id
    if (type) filter.type = type

    if (startDate || endDate) {
      filter.date = {}
      if (startDate) filter.date.$gte = new Date(startDate as string)
      if (endDate) filter.date.$lte = new Date(endDate as string)
    }

    // Text search filter
    if (search && typeof search === "string") {
      const searchRegex = new RegExp(search, "i") // case-insensitive
      filter.$or = [
        { merchant: { $regex: searchRegex } },
        { note: { $regex: searchRegex } },
      ]
    }

    // Pagination
    const pageNumber = parseInt(page as string) || 1
    const pageSize = 10
    const skip = (pageNumber - 1) * pageSize

    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(pageSize)

    const total = await Transaction.countDocuments(filter)

    return res.status(200).json({
      page: pageNumber,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      transactions,
    })
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

    const obj = await Transaction.findById(id)
    if (!obj) return res.status(404).json({ message: "Transaction not found" })

    const oldAmount = obj.amount
    const oldCategory = obj.category_id
    const oldDate = obj.date

    if (category_id) obj.category_id = category_id
    if (amount !== undefined) obj.amount = amount
    if (note !== undefined) obj.note = note
    if (date) obj.date = date

    await obj.save()

    if (obj.type === "EXPENSE" || obj.type === "INCOME") {
      const oldYM = getYearMonth(oldDate)
      const newYM = getYearMonth(obj.date)

      await Budget.findOneAndUpdate(
        {
          user_id: obj.user_id,
          category_id: oldCategory,
          year: oldYM.year,
          month: oldYM.month,
        },
        { $inc: { spent: -oldAmount } }
      )

      await Budget.findOneAndUpdate(
        {
          user_id: obj.user_id,
          category_id: obj.category_id,
          year: newYM.year,
          month: newYM.month,
        },
        { $inc: { spent: obj.amount } }
      )
    }

    return res.json({
      message: "Transaction updated successfully",
      transaction: obj,
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

    const obj = await Transaction.findById(id)
    if (!obj) return res.status(404).json({ message: "Transaction not found" })

    if (obj.type === "EXPENSE" || obj.type === "INCOME") {
      const { year, month } = getYearMonth(obj.date)

      await Budget.findOneAndUpdate(
        {
          user_id: obj.user_id,
          category_id: obj.category_id,
          year,
          month,
        },
        { $inc: { spent: -obj.amount } }
      )
    }

    await obj.deleteOne()

    return res.json({ message: "Transaction deleted successfully" })
  } catch (err) {
    console.error("Delete Error:", err)
    return res.status(500).json({ message: "Error deleting transaction" })
  }
}

export const getLatestTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub

    const transactions = await Transaction.find({ user_id: userId })
      .sort({ date: -1 })
      .limit(5)

    return res.status(200).json(transactions)
  } catch (error) {
    console.error("Error fetching latest transactions:", error)
    return res.status(500).json({ message: "Server error" })
  }
}

export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1 // default page 1
    const limit = 10
    const skip = (page - 1) * limit

    const searchUser = (req.query.searchUser as string) || ""
    const filterType = (req.query.filterType as string) || "ALL"
    const fromDate = req.query.fromDate as string
    const toDate = req.query.toDate as string

    const query: any = {}

    // Type filter
    if (filterType !== "ALL") {
      query.type = filterType
    }

    // Date filter
    if (fromDate || toDate) {
      query.date = {}
      if (fromDate) query.date.$gte = new Date(fromDate)
      if (toDate) query.date.$lte = new Date(toDate)
    }

    // User search (username/email)
    if (searchUser) {
      // Since user info is in another collection, we can use aggregation for filtering
      const total = await Transaction.aggregate([
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

      const totalCount = total[0]?.total || 0

      const transactions = await Transaction.aggregate([
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
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            ...query,
            $or: [
              { "user.username": { $regex: searchUser, $options: "i" } },
              { "user.email": { $regex: searchUser, $options: "i" } },
            ],
          },
        },
        { $sort: { date: -1 } },
        { $skip: skip },
        { $limit: limit },
      ])

      const formattedTransactions = transactions.map(tx => ({
        ...tx,
        user: tx.user || { username: "Unknown", email: "Unknown" },
        category: tx.category || { name: "Uncategorized", type: "UNKNOWN" },
      }))

      return res.status(200).json({
        success: true,
        page,
        totalPages: Math.ceil(totalCount / limit),
        totalTransactions: totalCount,
        transactions: formattedTransactions,
      })
    }

    // ================= If no user search =================
    const total = await Transaction.countDocuments(query)

    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user_id", "username email")
      .populate("category_id", "name type")

    const formattedTransactions = transactions.map(tx => {
      const obj = tx.toObject()
      return {
        ...obj,
        user: obj.user_id || { username: "Unknown", email: "Unknown" },
        category: obj.category_id || { name: "Uncategorized", type: "UNKNOWN" },
      }
    })

    res.status(200).json({
      success: true,
      page,
      totalPages: Math.ceil(total / limit),
      totalTransactions: total,
      transactions: formattedTransactions,
    })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    res.status(500).json({ success: false, message: "Failed to fetch transactions" })
  }
}