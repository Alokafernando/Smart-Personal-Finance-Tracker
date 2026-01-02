import Tesseract from "tesseract.js"
import mongoose from "mongoose"
import { Category, CategoryType } from "../model/category.model"
import { AuthRequest } from "../middleware/auth"
import { DEFAULT_CATEGORIES } from "../data/defaultCategories"

/* ================= HELPER FUNCTIONS ================= */

export const extractAmount = (text: string): string => {
  const cleanText = text
    .replace(/\s+/g, " ")        // collapse multiple spaces
    .replace(/[|=]/g, "")        // remove | and =

  // Rs / LKR =====
  const currencyRegex =
    /(rs\.?|lkr)\s*[:\-]?\s*(\d{1,3}(?:[ ,]\d{3})*(?:\.\d{2})?)/gi

  const currencyMatches = [...cleanText.matchAll(currencyRegex)]

  if (currencyMatches.length) {
    const amounts = currencyMatches.map(m =>
      parseFloat(m[2].replace(/,/g, "").replace(/\s/g, ""))
    )
    return Math.max(...amounts).toFixed(2)
  }

  // Amount / Total =====
  const amountRegex =
    /(amount|total|net total|transaction amount)[^\d]*(\d{1,3}(?:[ ,]\d{3})*(?:\.\d{2})?)/gi

  const amountMatches = [...cleanText.matchAll(amountRegex)]

  if (amountMatches.length) {
    const amounts = amountMatches.map(m =>
      parseFloat(m[2].replace(/,/g, "").replace(/\s/g, ""))
    )
    return Math.max(...amounts).toFixed(2)
  }

  // Fallback – Largest Reasonable =====
  const numbers = [...cleanText.matchAll(/\d{1,3}(?:[ ,]\d{3})*(?:\.\d{2})?/g)]
    .map(m => parseFloat(m[0].replace(/,/g, "").replace(/\s/g, "")))
    .filter(n => n >= 100) // ignore small junk numbers

  if (numbers.length) {
    return Math.max(...numbers).toFixed(2)
  }

  return "0.00"
}

/* ================= MERCHANT DETECTION ================= */

const extractMerchant = (text: string): string =>
  text.split(/\r?\n/)[0]?.trim() || "Unknown"

/* ================= CATEGORY DETECTION ================= */

const determineCategory = async (text: string, userId: string) => {
  const lower = text.toLowerCase()
  let categoryName = "Uncategorized"

  for (const cat of DEFAULT_CATEGORIES) {
    if (lower.includes(cat.name.toLowerCase())) {
      categoryName = cat.name
      break
    }
  }

  if (categoryName === "Uncategorized") {
    if (/salary|payroll|income/.test(lower)) categoryName = "Salary"
    else if (/investment| saving|dividend|stock|bonds|deposit|cash deposit|bank deposit|credited|fund transfer/.test(lower)) categoryName = "Investments"
    else if (/business|invoice|service/.test(lower)) categoryName = "Business"
    else if (/food|cafe|restaurant|coffee|meal|drink/.test(lower)) categoryName = "Food"
    else if (/shop|mall|clothes|shopping/.test(lower)) categoryName = "Shopping"
    else if (/fuel|gas|petrol|diesel/.test(lower)) categoryName = "Fuel"
    else if (/bill|utility|electric|water|internet/.test(lower)) categoryName = "Bills"
    else if (/entertainment|movie|cinema|theater|concert/.test(lower)) categoryName = "Entertainment"
  }

  const type: CategoryType =
    ["Salary", "Business", "Investments"].includes(categoryName)
      ? CategoryType.INCOME
      : CategoryType.EXPENSE

  let category = await Category.findOne({
    name: categoryName,
    user_id: userId
  })

  if (!category) {
    category = await Category.create({
      name: categoryName,
      type,
      icon: "📁",
      color: "#6366f1",
      user_id: new mongoose.Types.ObjectId(userId),
      is_default: false
    })
  }

  return { category, type }
}

/* ================= MAIN CONTROLLER ================= */

export const processReceiptOCR = async (req: AuthRequest, res: any) => {
  try {
    const userId = req.user?.sub

    if (!req.file?.buffer) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    const ocr = await Tesseract.recognize(req.file.buffer, "eng")
    const rawText = ocr?.data?.text?.trim()

    if (!rawText) {
      return res.status(500).json({ message: "OCR returned empty text" })
    }

    const amount = extractAmount(rawText)
    const merchant = extractMerchant(rawText)
    const { category, type } = await determineCategory(rawText, userId)

    return res.json({
      message: "OCR processed successfully",
      rawText,
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
    return res.status(500).json({
      message: "OCR failed",
      error: err?.message || err
    })
  }
}
