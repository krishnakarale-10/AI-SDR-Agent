import { Router } from "express";
import { register, login, refreshTokenController, logout, getMe } from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import { registerSchema, loginSchema } from "../../schemas/auth.schema.js";

const router = Router();

router.post("/register", validation(registerSchema), register);
router.post("/login", validation(loginSchema), login);
router.post("/refresh", refreshTokenController);
router.post("/refresh-token", refreshTokenController);
router.post("/logout", logout);
router.get("/me", authenticate, getMe);

export default router;
