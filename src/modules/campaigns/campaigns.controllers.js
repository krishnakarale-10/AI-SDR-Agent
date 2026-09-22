import asyncHandler from "my-async-handler";
import { ApiResponse } from "../../utils/apiResponse.js";
import { suggestCampaignTargeting } from "../../services/campaign.service.js";
import prisma from "../../config/prisma.js";

export const createCampaign = asyncHandler(async (req, res) => {
  const { name, product_description, value_props = [], tone = "Professional" } = req.body;
  const userId = req.user.id;

  // 1. Call external Groq LLM service to generate search_criteria
  const search_criteria = await suggestCampaignTargeting(
    product_description,
    value_props,
    tone
  );

  // 2. Save the campaign to PostgreSQL database using Prisma with status: "DRAFT"
  const campaign = await prisma.campaign.create({
    data: {
      user_id: userId,
      name,
      product_description,
      value_props,
      search_criteria,
      tone,
      status: "DRAFT",
    },
  });

  // 3. Initialize Campaign Analytics
  try {
    await prisma.campaignAnalytics.create({
      data: {
        campaign_id: campaign.id,
        total_leads: 0,
        emails_sent: 0,
        replies: 0,
        interested: 0,
        bounced: 0,
      },
    });
  } catch (err) {
    console.error("Failed to initialize campaign analytics:", err.message);
  }

  // 4. Return ONLY id and search_criteria (excluding user_id, created_at, etc.)
  res.status(201).json(
    new ApiResponse(
      201,
      {
        id: campaign.id,
        search_criteria: campaign.search_criteria,
      },
      "Campaign created successfully"
    )
  );
});
