import { Router } from "express";
import { register, login, logout, me } from "../controllers/authController";
import { requireAuth } from "../middleware/requireAuth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/logout", logout);
router.get("/me", requireAuth, asyncHandler(me));

export default router;
