import Tesseract from "tesseract.js"
import mongoose from "mongoose"
import { Transaction } from "../model/transaction.model"
import { Category, CategoryType } from "../model/category.model"
import { AuthRequest } from "../middleware/auth"
import { DEFAULT_CATEGORIES } from "../data/defaultCategories"

/* ================= Helper functions ================= */

const extractAmount = (text: string): number => {
  const lines = text.split(/\r?\n/)
  const numberRegex = /(\d+(?:,\d{3})*(?:\.\d{1,2})?)/

  for (const line of lines) {
    if (
      /(total|grand total|amount due|net total|balance due|amount|lkr|rs\.?)/i.test(line) &&
      !/subtotal/i.test(line)
    ) {
      const match = line.match(numberRegex)
      if (match) return parseFloat(match[1].replace(/,/g, ""))
    }
  }

  const allNumbers = [...text.matchAll(/\d+(?:,\d{3})*(?:\.\d{1,2})?/g)]
  if (allNumbers.length) {
    return Math.max(...allNumbers.map(m => parseFloat(m[0].replace(/,/g, ""))))
  }

  return 0
}

const extractMerchant = (text: string): string =>
  text.split("\n")[0]?.trim() || "Unknown"

const determineCategory = async (text: string, userId: string) => {
  const lower = text.toLowerCase()
  let ai_category = "Uncategorized"

  for (const cat of DEFAULT_CATEGORIES) {
    if (lower.includes(cat.name.toLowerCase())) {
      ai_category = cat.name
      break
    }
  }

  if (ai_category === "Uncategorized") {
    if (/salary|payroll|income/.test(lower)) ai_category = "Salary"
    else if (/investment|dividend|stock|bond/.test(lower)) ai_category = "Investments"
    else if (/business|invoice|service/.test(lower)) ai_category = "Business"
    else if (/food|cafe|restaurant|coffee|meal|drink/.test(lower)) ai_category = "Food"
    else if (/shop|mall|clothes|shopping/.test(lower)) ai_category = "Shopping"
    else if (/fuel|gas|petrol|diesel/.test(lower)) ai_category = "Fuel"
    else if (/bill|utility|electric|water|internet/.test(lower)) ai_category = "Bills"
    else if (/entertainment|movie|cinema|theater|concert/.test(lower)) ai_category = "Entertainment"
  }

  const type: CategoryType =
    ["Salary", "Business", "Investments"].includes(ai_category)
      ? CategoryType.INCOME
      : CategoryType.EXPENSE

  let category = await Category.findOne({ name: ai_category, user_id: userId })
  if (!category) {
    category = await Category.create({
      name: ai_category,
      type,
      icon: "📁",
      color: "#6366f1",
      user_id: new mongoose.Types.ObjectId(userId),
      is_default: false
    })
  }

  return { category, type }
}


export const processReceiptOCR = async (req: AuthRequest, res: any) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    const ocr = await Tesseract.recognize(req.file.buffer, "eng")
    const rawText = ocr?.data?.text?.trim()
    if (!rawText) return res.status(500).json({ message: "OCR returned empty text" })

    const userId = req.user?.sub
    const amount = extractAmount(rawText)
    const merchant = extractMerchant(rawText)
    const { category, type } = await determineCategory(rawText, userId)

    res.json({
      message: "OCR successful",
      transaction: {
        merchant,
        amount,
        date: new Date().toISOString().split("T")[0],
        ai_category: category.name,
        category_id: category._id.toString(),
        type
      }
    })
  } catch (err: any) {
    console.error("Processing failed:", err)
    res.status(500).json({
      message: "OCR failed",
      error: err?.message || err
    })
  }
}

