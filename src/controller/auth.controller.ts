import { Request, Response } from "express"
import { IUser, UserRole, Status, User } from "../model/user.model"
import bcrypt from "bcryptjs"
import { signAccessToken, signRefreshToken } from "../utils/tokens"
import { AuthRequest } from "../middleware/auth"

export const registerUser = async (req: Request, res: Response) => {
    try {
        const { username, email, password, role } = req.body

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (role !== UserRole.USER) {
            return res.status(400).json({ message: "Invalid role" });
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
            role: role,
            approved: approvalStatus,
            profileURL: req.body.profileURL || "-"
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


        const valid = await bcrypt.compare(password as string, existingUser.password as string);
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