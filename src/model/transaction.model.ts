import mongoose, { Document, Schema } from "mongoose"

export interface ITransaction extends Document {
    _id: mongoose.Types.ObjectId
    user_id: mongoose.Types.ObjectId
    category_id?: mongoose.Types.ObjectId
    amount: number
    date: Date
    note?: string
    merchant?: string
    raw_text?: string
    ai_category?: string
}

const transactionSchema = new Schema<ITransaction>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
        category_id: { type: Schema.Types.ObjectId, ref: "Category", required: false },// because AI may fill it
        amount: { type: Number,  required: true,  min: [0, "Amount cannot be negative"] },
        date: { type: Date,  required: true },
        note: { type: String,  trim: true },
        merchant: { type: String, trim: true },
        raw_text: {  type: String  },
        ai_category: { type: String, trim: true
        }
    },
    {
        timestamps: true
    }
)

export const Transaction = mongoose.model<ITransaction>("Transaction", transactionSchema)
