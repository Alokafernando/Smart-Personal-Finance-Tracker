import express from "express"
import { getSummaryAnalytics, } from "../controller/analytics.controller"
import { authenticate } from "../middleware/auth"

const router = express.Router()

router.get("/summary", authenticate, getSummaryAnalytics)


export default router
