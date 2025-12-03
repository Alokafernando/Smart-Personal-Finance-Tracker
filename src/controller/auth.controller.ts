import { Request, Response } from "express"
import { IUser, UserRole, Status, User } from "../model/user.model"
import bcrypt from "bcryptjs"
import { signAccessToken, signRefreshToken } from "../utils/tokens"
import { AuthRequest } from "../middleware/auth"

export const registerUser = async (req: Request, res: Response) => {
    try {
        const { username, email, password, role } = req.body

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" })
        }

        if (role !== UserRole.USER) {
            return res.status(400).json({ message: "Invalid role" })
        }

        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const approvalStatus =
            role === UserRole.USER ? Status.PENDING : Status.APPROVED

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role: [role],
            approved: approvalStatus,
            profileURL: req.body.profileURL
        })

        await newUser.save()

        res.status(201).json({
            message:
                role === UserRole.USER
                    ? "User registered successfully. waiting for approvel"
                    : "User registered successfully",
            data: {
                id: newUser._id,
                email: newUser.email,
                roles: newUser.role,
                approved: newUser.approved,
                profileURL: newUser.profileURL
            }
        })

    } catch (err: any) {
        res.status(500).json({ message: err?.message })

    }
}

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body

        const existingUser = await User.findOne({ email })
        if (!existingUser) {
            return res.status(401).json({ message: "Invalid credentials" })
        }

        // if (existingUser.approved === Status.PENDING) {
        //     return res.status(403).json({ message: "User is pending approval" })
        // }

        if (existingUser.approved === Status.REJECTED) {
            return res.status(403).json({ message: "User has been rejected and cannot log in" })
        }

        const valid = await bcrypt.compare(password as string, existingUser.password as string)
        if (!valid) {
            return res.status(401).json({ message: "Invalid credentials" })
        }

        const accessToken = signAccessToken(existingUser)
        const refreshToken = signRefreshToken(existingUser)

        res.status(200).json({
            message: "success",
            data: {
                email: existingUser.email,
                role: existingUser.role,
                accessToken,
                refreshToken
            }
        })
    } catch (err: any) {
        res.status(500).json({ message: err?.message })
    }
}

export const getUserDetails = async (req: AuthRequest, res: Response) => {

    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" })
    }

    const userId = req.user.sub
    const user =
        ((await User.findById(userId).select("-password")) as IUser) || null

    if (!user) {
        return res.status(404).json({
            message: "User not found"
        })
    }

    const { username, profileURL, email, role, approved } = user

    res.status(200).json({
        message: "Ok",
        data: { username, profileURL, email, role, approved }
    })
}


export const registerAdmin = async (req: Request, res: Response) => {
    try {
        const { username, email, password, role } = req.body

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" })
        }

        if (role !== UserRole.ADMIN) {
            return res.status(400).json({ message: "Invalid role" })
        }


        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const approvalStatus =
            role === UserRole.ADMIN ? Status.PENDING : Status.APPROVED

        const newAdmin = new User({
            username,
            email,
            password: hashedPassword,
            role: [role],
            approved: approvalStatus,
            profileURL: req.body.profileURL
        })

        await newAdmin.save()

        res.status(201).json({
            message:
                role === UserRole.ADMIN
                    ? "Admin registered successfully. waiting for approvel"
                    : "Admin registered successfully",
            data: {
                id: newAdmin._id,
                email: newAdmin.email,
                role: newAdmin.role,
                approved: newAdmin.approved,
                profileURL: newAdmin.profileURL
            }
        })
    } catch (err: any) {
        res.status(500).json({ message: err?.message })
    }
}

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user._id // from auth middleware

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" })
    }

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 10)
    user.password = hashed

    await user.save()

    res.status(200).json({ message: "Password updated successfully" })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}
