import mongoose, { Document, Schema } from "mongoose"

export interface IBudget extends Document {
    _id: mongoose.Types.ObjectId
    user_id: mongoose.Types.ObjectId
    category_id: mongoose.Types.ObjectId
    amount: number
    month: number
    year: number
}

const budgetSchema = new Schema<IBudget>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
        category_id: { type: Schema.Types.ObjectId, ref: "Category", required: true },
        amount: { type: Number, required: true, min: [0, "Amount cannot be negative"] },
        month: { type: Number, required: true, min: 1, max: 12, },
        year: { type: Number, required: true, min: 2000, max: 2100 },
    },
    {
        timestamps: true
    }
)

// Prevent duplicate budgets for same user/category/month/year
budgetSchema.index(
    {
        user_id: 1,
        category_id: 1,
        month: 1, year: 1
    },
    {
        unique: true
    }
)

export const Budget = mongoose.model<IBudget>("Budget", budgetSchema);
