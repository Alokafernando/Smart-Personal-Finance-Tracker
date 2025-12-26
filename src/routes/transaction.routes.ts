import { Router } from "express"
import { createTransaction, getTransactions, updateTransaction, deleteTransaction, getLatestTransactions, getAllTransactions, getAnalyticsSummary } from "../controller/transaction.controller"
import { authenticate } from "../middleware/auth"
import { requireRole } from "../middleware/role"
import { UserRole } from "../model/user.model"

const router = Router()

router.post("/", authenticate, createTransaction)
router.get("/", authenticate, getTransactions) //user's
router.put("/:id", authenticate, updateTransaction)
router.delete("/:id", authenticate, deleteTransaction)
router.get("/latest", authenticate, getLatestTransactions)

///for admin 
router.get("/admin/all", authenticate, requireRole([UserRole.ADMIN]), getAllTransactions) 
router.get("/admin/analytics/summary", authenticate, requireRole([UserRole.ADMIN]), getAnalyticsSummary);


export default router
