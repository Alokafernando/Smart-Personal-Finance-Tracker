import express from "express"
import { getSummaryAnalytics, getMonthlyAnalytics, getCategoryAnalytics, } from "../controller/analytics.controller"
import { authenticate } from "../middleware/auth"

const router = express.Router()

router.get("/summary", authenticate, getSummaryAnalytics)
router.get("/monthly", authenticate, getMonthlyAnalytics)
router.get("/category", authenticate, getCategoryAnalytics)

export default router
