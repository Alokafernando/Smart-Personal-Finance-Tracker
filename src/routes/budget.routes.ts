import { Router } from "express"
import { createBudget, getBudgets, updateBudget, deleteBudget, getLatestBudgets } from "../controller/budget.controller"
import { authenticate } from "../middleware/auth"

const router = Router()

router.post("/", authenticate, createBudget)
router.get("/", authenticate, getBudgets)
router.put("/:id", authenticate, updateBudget)
router.delete("/:id", authenticate, deleteBudget)
router.get("/latest", authenticate, getLatestBudgets)

export default router
