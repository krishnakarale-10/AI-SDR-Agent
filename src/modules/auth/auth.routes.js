import { Router } from "express";
import { register,login } from "./auth.controller.js";
import { validation } from "../../middleware/validation.middleware.js";
import {registerSchema,loginSchema} from "../../schemas/auth.schema.js"

const router=Router();

router.post("/register",validation(registerSchema),register);
router.post("/login",validation(loginSchema),login);
export default router