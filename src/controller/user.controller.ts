import { Request, Response } from "express"
import { Status, User } from "../model/user.model"
import cloudinary from "../config/cloudinary"
import { AuthRequest } from "../middleware/auth"
import { Transaction } from "../model/transaction.model"


export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const loggedInUserId = req.user.sub

    const users = await User.find({ _id: { $ne: loggedInUserId } })
      .select("-password") // hide password

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

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    user.approved = Status.REJECTED
    await user.save()

    res.status(200).json({ message: "User has been rejected/deactivated", user })

  } catch (err: any) {
    res.status(500).json({ message: err.message || "Server error" })
  }
}

export const updateProfileImage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.sub // or req.user.userId depending on your auth
    const file = req.file

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    // Upload file buffer to Cloudinary
    const uploadRes = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "user-profiles" },
        (error, result) => {
          if (error) return reject(error)
          resolve(result)
        }
      )
      stream.end(file.buffer)
    })

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profileURL: uploadRes.secure_url },
      { new: true }
    ).select("-password")

    res.status(200).json({
      message: "Profile image updated successfully",
      data: updatedUser,
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Failed to upload profile image" })
  }
}

export const updateUserStatus = async (req: AuthRequest, res: Response) => {
  const userId = req.params.id
  const { status } = req.body

  const validStatuses = ["PENDING", "APPROVED", "REJECTED"]

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" })
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { approved: status },
      { new: true }
    )

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    return res.json({ message: "Status updated successfully", user })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Failed to update user status" })
  }
}

export const getUserTransactionCounts = async (req: Request, res: Response) => {
  try {
    const transactions = await Transaction.find()
      .populate("user_id", "name")
      .exec()

    const counts: Record<string, any> = {}

    transactions.forEach(tx => {
      const user = tx.user_id
      if (!user) return

      const uid = user._id.toString()
      if (!counts[uid]) {
        counts[uid] = {
          userId: uid,
          transactionCount: 0,
        }
      }
      counts[uid].transactionCount += 1
    })

    res.status(200).json({ success: true, data: Object.values(counts) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server Error" })
  }
}