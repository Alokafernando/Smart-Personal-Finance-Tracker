import { Router } from "express"
import { changePassword, getUserDetails, login, registerAdmin, registerUser, sendOtp, verifyOtpAndResetPassword } from "../controller/auth.controller"
import { authenticate } from "../middleware/auth"
import { requireRole } from "../middleware/role"
import { UserRole } from "../model/user.model"

const router = Router()

router.post("/register", registerUser) //Role[USER]
router.post("/login", login) 
router.get("/me", authenticate, getUserDetails)
router.post("/admin/register", authenticate, requireRole([UserRole.ADMIN]), registerAdmin )
router.put("/change-password", authenticate, changePassword)
router.post("/send-otp", sendOtp)
router.post("/verify-otp", verifyOtpAndResetPassword)


export default router