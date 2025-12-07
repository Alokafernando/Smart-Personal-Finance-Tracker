import { Router } from "express"
import { createBudget, getBudgets, updateBudget, deleteBudget } from "../controller/budget.controller"
import { authenticate } from "../middleware/auth"

const router = Router()

router.post("/", authenticate, createBudget)
router.get("/", authenticate, getBudgets)
// router.put("/:id", authenticate, updateBudget)
// router.delete("/:id", authenticate, deleteBudget)

export default router
