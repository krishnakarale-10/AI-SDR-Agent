import { Router } from "express";
import { register } from "./auth.controller.js";
import { validation } from "../../middleware/validation.middleware.js";
import {registerSchema} from "../../schemas/auth.schema.js"

const router=Router();

router.post("/register",validation(registerSchema),register);

export default router