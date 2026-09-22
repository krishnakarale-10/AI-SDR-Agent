import { z } from "zod";

export const createCampaignSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Campaign name is required" })
      .trim()
      .min(3, "Campaign name must be at least 3 characters"),
    product_description: z
      .string({ required_error: "Product description is required" })
      .trim()
      .min(10, "Product description must be at least 10 characters"),
    value_props: z.array(z.string()).optional().default([]),
    tone: z.string().optional().default("Professional"),
  }),
});
