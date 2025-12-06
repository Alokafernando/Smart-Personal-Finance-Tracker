import { Request, Response } from "express"
import { Category, CategoryType } from "../model/category.model"
import mongoose from "mongoose"
import { AuthRequest } from "../middleware/auth"

// Create Category
export const createCategory = async (req: AuthRequest, res: Response) => {
    try {
        const { name, type, icon, color } = req.body
        const userId = req.user.sub // from auth middleware

        // const existing = await Category.findOne({ name: name.trim(), user_id: userId })
        // if (existing) {
        //   return res.status(400).json({ message: `${name} Category already exists` })
        // }
        const existing = await Category.findOne({
            user_id: userId,
            name: { $regex: `^${name.trim()}$`, $options: "i" }
        })

        if (existing) {
            return res.status(400).json({ message: `${name} category already exists` })
        }


        const newCategory = new Category({
            name: name.trim(),
            type,
            icon,
            color,
            user_id: userId,
            is_default: false
        })

        await newCategory.save()

        res.status(201).json({ message: "Category created successfully", data: newCategory })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
}

// Get All Categories 
export const getCategories = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.sub

        const categories = await Category.find({
            $or: [
                { user_id: userId },  // user-created categories
            ],
        })

        return res.status(200).json({ categories })
    } catch (error) {
        return res.status(500).json({ message: "Server error", error })
    }
}


// Update Category
export const updateCategory = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user._id
        const categoryId = req.params.id
        const { name, icon, color, type } = req.body

        if (!mongoose.isValidObjectId(categoryId)) {
            return res.status(400).json({ message: "Invalid category ID" })
        }

        const category = await Category.findById(categoryId)

        if (!category) {
            return res.status(404).json({ message: "Category not found" })
        }

        // Default categories CANNOT be updated
        if (category.is_default) {
            return res.status(403).json({
                message: "Default categories cannot be updated",
            })
        }

        // Only owner's category can be updated
        if (category.user_id?.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "You do not have permission to update this category",
            })
        }

        category.name = name ?? category.name
        category.icon = icon ?? category.icon
        category.color = color ?? category.color
        if (type && Object.values(CategoryType).includes(type)) {
            category.type = type
        }

        await category.save()

        return res.status(200).json({
            message: "Category updated successfully",
            category,
        })
    } catch (error) {
        return res.status(500).json({ message: "Server error", error })
    }
}

// Delete Category
export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.sub
    const categoryId = req.params.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    if (!mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({ message: "Invalid category ID" })
    }

    const category = await Category.findById(categoryId) // find category

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (category.is_default) {
      return res.status(403).json({ message: "Default categories cannot be deleted" });
    }

    if (!category.user_id) {
      return res.status(403).json({ message: "Category does not belong to any user" });
    }

    if (category.user_id.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You do not have permission to delete this category" })
    }

    await category.deleteOne() //delete category

    return res.status(200).json({ message: "Category deleted successfully" })

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Internal Server Error" })
  }
};
