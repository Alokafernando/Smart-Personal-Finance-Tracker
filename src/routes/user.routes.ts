import { Router } from "express";
import { getUserDetails, login, registerUser } from "../controller/auth.controller";
import { authenticate } from "../middleware/auth";

const router = Router()

router.post("/register", registerUser) //Role[USER]
router.post("/login", login) 
router.get("/me", authenticate, getUserDetails)

export default router