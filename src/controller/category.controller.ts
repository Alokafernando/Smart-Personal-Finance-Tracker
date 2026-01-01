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
        const userId = req.user.sub
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

        if (!category.user_id || !userId || category.user_id.toString() !== userId.toString()) {
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
    } catch (err: any) {
        return res.status(500).json({ message: err.message })
    }
}

// Delete Category
export const deleteCategory = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.sub
        const categoryId = req.params.id

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        if (!mongoose.isValidObjectId(categoryId)) {
            return res.status(400).json({ message: "Invalid category ID" })
        }

        const category = await Category.findById(categoryId) // find category

        if (!category) {
            return res.status(404).json({ message: "Category not found" })
        }

        if (category.is_default) {
            return res.status(403).json({ message: "Default categories cannot be deleted" })
        }

        if (!category.user_id) {
            return res.status(403).json({ message: "Category does not belong to any user" })
        }

        if (category.user_id.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You do not have permission to delete this category" })
        }

        await category.deleteOne() //delete category

        return res.status(200).json({ message: "Category deleted successfully" })

    } catch (err: any) {
        console.error(err)
        return res.status(500).json({ message: err.message || "Internal Server Error" })
    }
}

export const getAllCategories = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1
        const limit = 10
        const skip = (page - 1) * limit
        const searchUser = (req.query.searchUser as string) || ""

        // Base match for non-default categories with a user
        const matchStage: any = { is_default: false, user_id: { $ne: null } }

        const aggregatePipeline: any[] = [
            { $match: matchStage },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" }
        ]

        if (searchUser) {
            aggregatePipeline.push({
                $match: {
                    $or: [
                        { "user.username": { $regex: searchUser, $options: "i" } },
                        { "user.email": { $regex: searchUser, $options: "i" } },
                    ],
                },
            })
        }

        // Facet to get both total count and paginated data
        aggregatePipeline.push({
            $facet: {
                total: [{ $count: "count" }],
                data: [
                    { $sort: { createdAt: -1 } },
                    { $skip: skip },
                    { $limit: limit }
                ]
            }
        })

        const result = await Category.aggregate(aggregatePipeline)

        const totalCount = result[0]?.total[0]?.count || 0
        const categoriesData = result[0]?.data || []

        // ================= GROUP BY USER =================
        const usersMap: Record<string, any> = {}

        categoriesData.forEach((c: any) => {
            const user = c.user ?? (c.user_id && typeof c.user_id === "object" ? c.user_id : null)
            const userId = user?._id?.toString() || "orphan"
            const username = user?.username || "Unknown"
            const email = user?.email || "Unknown"

            if (!usersMap[userId]) {
                usersMap[userId] = { userId, username, email, categories: [] }
            }

            usersMap[userId].categories.push({
                name: c.name,
                is_default: c.is_default,
            })
        })

        res.status(200).json({
            page,
            totalPages: Math.ceil(totalCount / limit),
            totalCategories: totalCount,
            users: Object.values(usersMap),
        })
    } catch (error: any) {
        console.error(error)
        res.status(500).json({ message: error.message || "Failed to fetch categories" })
    }
}
