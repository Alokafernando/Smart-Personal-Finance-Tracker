import { Request, Response } from "express"
import { User } from "../model/user.model"

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password") // hide password

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found" })
    }

    res.status(200).json({ count: users.length, users})
  } catch (err: any) {
      res.status(500).json({ message: err.message || "Server error" })
  }
}


