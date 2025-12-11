import { Router } from "express"
import { createTransaction, getTransactions, updateTransaction, deleteTransaction } from "../controller/transaction.controller"
import { authenticate } from "../middleware/auth"

const router = Router()

router.post("/", authenticate, createTransaction)
router.get("/", authenticate, getTransactions)
// router.get("/:id", authenticate, getSingleTransaction)
router.put("/:id", authenticate, updateTransaction)
router.delete("/:id", authenticate, deleteTransaction)

export default router
