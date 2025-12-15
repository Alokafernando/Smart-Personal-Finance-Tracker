import express from "express"
import { getSummaryAnalytics, getMonthlyAnalytics, getCategoryAnalytics, getFilteredAnalyticsByMonthOrYear, } from "../controller/analytics.controller"
import { authenticate } from "../middleware/auth"
import { exportAnalyticsPDF } from "../controller/analytics.export.controller"

const router = express.Router()

router.get("/summary", authenticate, getSummaryAnalytics)
router.get("/monthly", authenticate, getMonthlyAnalytics)
router.get("/category", authenticate, getCategoryAnalytics)

router.post("/filter", authenticate, getFilteredAnalyticsByMonthOrYear)

router.post("/export/pdf", authenticate, exportAnalyticsPDF)

export default router
