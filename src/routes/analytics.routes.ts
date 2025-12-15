import express from "express"
import { getSummaryAnalytics, getMonthlyAnalytics, getCategoryAnalytics, getFilteredAnalyticsByMonthOrYear, } from "../controller/analytics.controller"
import { authenticate } from "../middleware/auth"

const router = express.Router()

router.get("/summary", authenticate, getSummaryAnalytics)
router.get("/monthly", authenticate, getMonthlyAnalytics)
router.get("/category", authenticate, getCategoryAnalytics)

router.post("/filter", authenticate, getFilteredAnalyticsByMonthOrYear)

export default router
