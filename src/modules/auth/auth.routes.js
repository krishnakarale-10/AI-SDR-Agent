import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, refreshTokenController, logout, getMe,verifyEmailController,resendVerificationController,forgetPasswordController,resetPasswordController } from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import { registerSchema, loginSchema,verifyEmailSchema,forgetPasswordSchema,resetPasswordSchema } from "../../schemas/auth.schema.js";

const router = Router();

// Rate limiter for email-sending endpoints to prevent email bombing
const emailRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // max 5 requests per 15 min window per IP
    message: { success: false, message: "Too many requests. Please try again after 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post("/register", validation(registerSchema), register);
router.post("/login", validation(loginSchema), login);
router.post("/refresh", refreshTokenController);
router.post("/refresh-token", refreshTokenController);
router.post("/logout", logout);
router.get("/me", authenticate, getMe);
router.post("/verify-email", validation(verifyEmailSchema), verifyEmailController);
router.post("/resend-verification", emailRateLimiter, authenticate, resendVerificationController);
router.post("/forgot-password", emailRateLimiter, validation(forgetPasswordSchema), forgetPasswordController);
router.post("/reset-password", validation(resetPasswordSchema), resetPasswordController);   

export default router;

