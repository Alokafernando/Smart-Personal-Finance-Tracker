import mongoose, { Document, Schema } from "mongoose"

export enum CategoryType {
    INCOME = "INCOME",
    EXPENSE = "EXPENSE",
}

export interface ICategory extends Document {
    _id: mongoose.Types.ObjectId
    user_id: mongoose.Types.ObjectId | null  
    name: string
    icon: string
    color: string
    type: CategoryType
    is_default: boolean
}

const categorySchema = new Schema<ICategory>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: "User", default: null }, // keep null for global defaults
        name: { type: String, required: true, trim: true },
        icon: { type: String, required: true, default: "Tag" },
        color: { type: String, required: true, default: "#4D96FF" },
        type: { 
            type: String,
            enum: Object.values(CategoryType), 
            required: true 
        },
        is_default: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
)

export const Category = mongoose.model<ICategory>("Category", categorySchema)
