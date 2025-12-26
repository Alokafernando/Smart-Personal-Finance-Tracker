import { Router } from "express"
import { createCategory, getCategories, updateCategory, deleteCategory, getAllCategories } from "../controller/category.controller"
import { authenticate } from "../middleware/auth"
import { requireRole } from "../middleware/role"
import { UserRole } from "../model/user.model"

const router = Router()

router.get("/", authenticate, getCategories)
router.post("/", authenticate, createCategory)
router.put("/:id", authenticate, updateCategory)
router.delete("/:id", authenticate, deleteCategory)
router.get("/admin/all", authenticate, requireRole([UserRole.ADMIN]), getAllCategories)

export default router
