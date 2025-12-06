import { Router } from "express"
import { createCategory, getCategories, updateCategory, deleteCategory } from "../controller/category.controller"
import { authenticate } from "../middleware/auth"

const router = Router()

router.get("/", authenticate, getCategories)
router.post("/", authenticate, createCategory)
router.put("/:id", authenticate, updateCategory)
router.delete("/:id", authenticate, deleteCategory)

export default router
