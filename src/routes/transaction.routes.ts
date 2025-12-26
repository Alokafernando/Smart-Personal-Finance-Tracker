import { Router } from "express"
import { createTransaction, getTransactions, updateTransaction, deleteTransaction, getLatestTransactions, getAllTransactions } from "../controller/transaction.controller"
import { authenticate } from "../middleware/auth"
import { requireRole } from "../middleware/role"
import { UserRole } from "../model/user.model"

const router = Router()

router.post("/", authenticate, createTransaction)
router.get("/", authenticate, getTransactions) //user's
router.put("/:id", authenticate, updateTransaction)
router.delete("/:id", authenticate, deleteTransaction)
router.get("/latest", authenticate, getLatestTransactions)
router.get("/all", authenticate, requireRole([UserRole.ADMIN]), getAllTransactions) //admin

export default router
