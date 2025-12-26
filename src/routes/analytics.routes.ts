import express from "express"
import { getSummaryAnalytics, getMonthlyAnalytics, getCategoryAnalytics, getFilteredAnalyticsByMonthOrYear, getAnalyticsSummaryForAdmin, getMonthlyAnalyticsForAdmin, } from "../controller/analytics.controller"
import { authenticate } from "../middleware/auth"
import { exportAnalyticsPDF, getBalanceTrend } from "../controller/analytics.export.controller"
import { requireRole } from "../middleware/role"
import { UserRole } from "../model/user.model"

const router = express.Router()

router.get("/summary", authenticate, getSummaryAnalytics)
router.get("/monthly", authenticate, getMonthlyAnalytics)
router.get("/category", authenticate, getCategoryAnalytics)
router.post("/filter", authenticate, getFilteredAnalyticsByMonthOrYear)
router.post("/export/pdf", authenticate, exportAnalyticsPDF)
router.get("/balance-trend", authenticate, getBalanceTrend)

//admin
router.get("/admin/summary", authenticate, requireRole([UserRole.ADMIN]), getAnalyticsSummaryForAdmin)
router.get("/admin/monthly", authenticate, requireRole([UserRole.ADMIN]), getMonthlyAnalyticsForAdmin)


export default router
