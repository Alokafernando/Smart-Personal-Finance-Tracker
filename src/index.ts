import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import authRouter from "./routes/auth.routes"
import userRouter from "./routes/user.routes"
import categoryRouter from "./routes/category.routes"
import budgetRouter from "./routes/budget.routes"
import transactionRouter from "./routes/transaction.routes"
import analyticsRoutes from "./routes/analytics.routes"
import ocrRoutes from "./routes/ocr.routes"
import mongoose from "mongoose"

dotenv.config()

const SERVER_PORT = process.env.SERVER_PORT
const MONGO_URI = process.env.MONGO_URI as string 

const app = express()

app.use(express.json())
app.use(cors({
    origin: ["http://localhost:5173"],
    methods: ["POST", "GET", "PUT", "DELETE"]
}))

app.use("/api/v1/auth", authRouter)
app.use("/api/v1/user", userRouter)
app.use("/api/v1/category", categoryRouter)
app.use("/api/v1/budget", budgetRouter)
app.use("/api/v1/transactions", transactionRouter)
app.use("/api/v1/analytics", analyticsRoutes)
app.use("/api/v1/ocr", ocrRoutes)


mongoose
.connect(MONGO_URI)
.then(() => {
    console.log("DB Connected")
})
.catch((err) => {
    console.log(`DB Connection fail: ${err}`)
    process.exit(1)
})


app.listen(SERVER_PORT, () => {
    console.log("server is running")
})