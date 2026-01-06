// import express from "express"
// import dotenv from "dotenv"
// import cors from "cors"
// import authRouter from "./routes/auth.routes"
// import userRouter from "./routes/user.routes"
// import categoryRouter from "./routes/category.routes"
// import budgetRouter from "./routes/budget.routes"
// import transactionRouter from "./routes/transaction.routes"
// import analyticsRoutes from "./routes/analytics.routes"
// import ocrRoutes from "./routes/ocr.routes"
// import mongoose from "mongoose"

// dotenv.config()

// const SERVER_PORT = process.env.SERVER_PORT
// const MONGO_URI = process.env.MONGO_URI as string 

// const app = express()

// app.options("*", cors())
// app.use(express.json())

// app.use(cors({
//     origin: ["http://localhost:5173", "https://smart-personal-finance-tracker-fe.vercel.app"],
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
// }))

// app.use("/api/v1/auth", authRouter)
// app.use("/api/v1/user", userRouter)
// app.use("/api/v1/category", categoryRouter)
// app.use("/api/v1/budget", budgetRouter)
// app.use("/api/v1/transactions", transactionRouter)
// app.use("/api/v1/analytics", analyticsRoutes)
// app.use("/api/v1/ocr", ocrRoutes)


// mongoose
//     .connect(MONGO_URI)
//     .then(() => {
//         console.log("DB Connected")
//     })
//     .catch((err) => {
//         console.log(`DB Connection fail: ${err}`)
//         process.exit(1)
//     })



import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import mongoose from "mongoose"

import authRouter from "./routes/auth.routes"
import userRouter from "./routes/user.routes"
import categoryRouter from "./routes/category.routes"
import budgetRouter from "./routes/budget.routes"
import transactionRouter from "./routes/transaction.routes"
import analyticsRoutes from "./routes/analytics.routes"
import ocrRoutes from "./routes/ocr.routes"

dotenv.config()

const MONGO_URI = process.env.MONGO_URI as string

const app = express()

// ✅ Combined CORS for preflight and normal requests
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://smart-personal-finance-tracker-fe.vercel.app",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}

app.use(cors(corsOptions))
app.options("*", cors(corsOptions))

app.use(express.json())

// Routes
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/user", userRouter)
app.use("/api/v1/category", categoryRouter)
app.use("/api/v1/budget", budgetRouter)
app.use("/api/v1/transactions", transactionRouter)
app.use("/api/v1/analytics", analyticsRoutes)
app.use("/api/v1/ocr", ocrRoutes)

// DB
mongoose.connect(MONGO_URI).then(() => console.log("DB Connected"))

// ✅ Export for Vercel serverless
export default app
