import { Router } from "express";
import { login, registerUser } from "../controller/auth.controller";

const router = Router()

router.post("/register", registerUser) //user only
router.post("/login", login)

export default router