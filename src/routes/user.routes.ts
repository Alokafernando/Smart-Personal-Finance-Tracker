import { Router } from "express";
import { getUserDetails, login, registerAdmin, registerUser } from "../controller/auth.controller";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { UserRole } from "../model/user.model";

const router = Router()

router.post("/register", registerUser) //Role[USER]
router.post("/login", login) 
router.get("/me", authenticate, getUserDetails)
router.post("/admin/register", authenticate, requireRole([UserRole.ADMIN]), registerAdmin )

export default router