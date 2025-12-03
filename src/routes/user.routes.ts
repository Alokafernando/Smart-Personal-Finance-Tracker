import { Router } from "express"
import { authenticate } from "../middleware/auth"
import { requireRole } from "../middleware/role"
import { UserRole } from "../model/user.model"
import { getAllUsers, getUserById } from "../controller/user.controller"

const router = Router()

const ADMIN = [UserRole.ADMIN]

router.get("/", authenticate, requireRole(ADMIN), getAllUsers) // GET /api/v1/user — admin: list users
router.get("/:id", authenticate, requireRole(ADMIN), getUserById) // GET /api/v1/user/:id — admin: get user details
//router.put("/:id", authenticate, requireRole([UserRole.ADMIN]), updateUser) // PUT /api/v1/user/:id — admin: update user
//router.delete( "/:id", authenticate, requireRole([UserRole.ADMIN]), deleteUser) // DELETE /api/v1/user/:id — admin: delete user

export default router