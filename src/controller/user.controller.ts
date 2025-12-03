import { Request, Response } from "express"
import { User } from "../model/user.model"

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find().select("-password") // hide password

        if (users.length === 0) {
            return res.status(404).json({ message: "No users found" })
        }

        res.status(200).json({ count: users.length, users })
    } catch (err: any) {
        res.status(500).json({ message: err.message || "Server error" })
    }
}

export const getUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        const user = await User.findById(id).select("-password")

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        res.status(200).json({ user })
    } catch (err: any) {
        res.status(500).json({ message: err.message || "Server error" })
    }
}

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params  
    const updates = req.body    

    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      new: true,       //update response eka penvnva
      runValidators: true
    }).select("-password")

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(200).json({ message: "User updated successfully", user: updatedUser })

  } catch (err: any) {
    res.status(500).json({ message: err.message || "Server error" })
  }
}
