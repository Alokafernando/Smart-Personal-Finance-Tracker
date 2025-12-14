import express from "express"
import { getSummaryAnalytics, getMonthlyAnalytics,  } from "../controller/analytics.controller"
import { authenticate } from "../middleware/auth"

const router = express.Router()

router.get("/summary", authenticate, getSummaryAnalytics)
router.get("/monthly", authenticate, getMonthlyAnalytics)

export default router
