import { Router } from "express"
import { createBudget, getBudgets, updateBudget, deleteBudget, getLatestBudgets, getAllBudgets } from "../controller/budget.controller"
import { authenticate } from "../middleware/auth"
import { requireRole } from "../middleware/role"
import { UserRole } from "../model/user.model"

const router = Router()

router.post("/", authenticate, createBudget)
router.get("/", authenticate, getBudgets)
router.put("/:id", authenticate, updateBudget)
router.delete("/:id", authenticate, deleteBudget)
router.get("/latest", authenticate, getLatestBudgets)
router.get("/all", authenticate, requireRole([UserRole.ADMIN]), getAllBudgets) //admin


export default router
