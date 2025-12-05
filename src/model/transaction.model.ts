import mongoose, { Document, Schema } from "mongoose"

export enum TransactionType {
    INCOME = "INCOME",
    EXPENSE = "EXPENSE",
}

export interface ITransaction extends Document {
    _id: mongoose.Types.ObjectId
    userId: mongoose.Types.ObjectId
    type: TransactionType;
    amount: number
    category: string
    date: Date
    note: string
    merchant: string
    rawText: string
    aiCategory: string
    createdAt: Date
}

const TransactionSchema = new Schema<ITransaction>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        type: { type: String, enum: Object.values(TransactionType), required: true },
        amount: { type: Number, required: true },
        category: { type: String, required: true },
        date: { type: Date, default: Date.now },
        note: { type: String },
        merchant: { type: String },
        rawText: { type: String },
        aiCategory: { type: String },
        createdAt: { type: Date, default: Date.now },
    },
    {
        timestamps: true
    }
)

export const Transaction = mongoose.model<ITransaction>("Transaction", TransactionSchema)
