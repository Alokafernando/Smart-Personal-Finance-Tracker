import mongoose, { Document, Schema } from "mongoose"

export interface IBudget extends Document {
    _id: mongoose.Types.ObjectId
    user_id: mongoose.Types.ObjectId
    category_id: mongoose.Types.ObjectId
    amount: number
    spent: number
}

const budgetSchema = new Schema<IBudget>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
        category_id: { type: Schema.Types.ObjectId, ref: "Category", required: true },
        amount: { type: Number, required: true, min: [0, "Amount cannot be negative"] },
        spent: { type: Number, required: true, default: 0, min: [0, "Spent cannot be negative"] },
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
    },
    {
        unique: true
    }
)

export const Budget = mongoose.model<IBudget>("Budget", budgetSchema);
