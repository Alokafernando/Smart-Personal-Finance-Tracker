import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";

import authRouter from "./routes/auth.routes";
import userRouter from "./routes/user.routes";
import categoryRouter from "./routes/category.routes";
import budgetRouter from "./routes/budget.routes";
import transactionRouter from "./routes/transaction.routes";
import analyticsRoutes from "./routes/analytics.routes";
import ocrRoutes from "./routes/ocr.routes";

dotenv.config();

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

const MONGO_URI = process.env.MONGO_URI as string;
if (!MONGO_URI) throw new Error("MONGO_URI not defined");

let cached = (global as any).mongoose;
if (!cached) cached = (global as any).mongoose = { conn: null, promise: null };

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

connectDB()
  .then(() => console.log("DB Connected"))
  .catch(err => console.error(err));

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Smart Personal Finance Tracker Backend Live 🚀",
  });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/category", categoryRouter);
app.use("/api/v1/budget", budgetRouter);
app.use("/api/v1/transactions", transactionRouter);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/ocr", ocrRoutes);

export default app;
