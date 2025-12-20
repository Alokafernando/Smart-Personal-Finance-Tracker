import { Router } from "express"
import { createTransaction, getTransactions, updateTransaction, deleteTransaction, getLatestTransactions } from "../controller/transaction.controller"
import { authenticate } from "../middleware/auth"

const router = Router()

router.post("/", authenticate, createTransaction)
router.get("/", authenticate, getTransactions)
router.put("/:id", authenticate, updateTransaction)
router.delete("/:id", authenticate, deleteTransaction)
router.get("/latest", authenticate, getLatestTransactions)


export default router
