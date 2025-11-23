import mongoose, { Document, Schema } from "mongoose"

export enum UserRole {
    ADMIN = 'ADMIN',
    USER = 'USER',
}

export enum Status {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
}

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId
    username: String
    email: String
    password: String
    role: UserRole[]
    approved: Status
}


const userScehema = new Schema<IUser>({
    username: { type: String, required: true },
    email: { type: String, unique: true, lowercase: true, required: true },
    password: { type: String, required: true },
    role: {
        type: [String],
        enum: Object.values(UserRole),
        default: [UserRole.USER],
    },
    approved: {
        type: String,
        enum: Object.values(Status),
        default: Status.PENDING,
    },
})

export const User = mongoose.model<IUser>("User", userScehema)