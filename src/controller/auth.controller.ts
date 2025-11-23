import { Request, Response } from "express"
import { UserRole, Status, User } from "../model/user.model"
import bcrypt from "bcryptjs"

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
            approved: approvalStatus
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
                approved: newUser.approved
            }
        })
    } catch (err: any) {
        res.status(500).json({ message: err?.message })

    }
}

export const login = (req: Request, res: Response) => {

}