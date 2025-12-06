import { CategoryType } from "../model/category.model";

export const DEFAULT_CATEGORIES = [
    // Income
    { name: "Salary", type: CategoryType.INCOME, icon: "💼" },
    { name: "Business", type: CategoryType.INCOME, icon: "📈" },
    { name: "Investments", type: CategoryType.INCOME, icon: "🏦" },

    // Expense
    { name: "Food", type: CategoryType.EXPENSE, icon: "🍔" },
    { name: "Shopping", type: CategoryType.EXPENSE, icon: "🛍️" },
    { name: "Fuel", type: CategoryType.EXPENSE, icon: "⛽" },
    { name: "Bills", type: CategoryType.EXPENSE, icon: "💡" },
    { name: "Entertainment", type: CategoryType.EXPENSE, icon: "🎬" },
];
