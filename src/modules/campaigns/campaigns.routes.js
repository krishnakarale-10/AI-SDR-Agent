import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import { createCampaign } from "./campaigns.controllers.js";
import { createCampaignSchema } from "../../schemas/campaigns.schemas.js";

const router = Router();

// Protected by authenticate middleware
router.post("/", authenticate, validation(createCampaignSchema), createCampaign);

export default router;
