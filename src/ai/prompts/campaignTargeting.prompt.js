import {z} from "zod";
import {ChatPromptTemplate} from "@langchain/core/prompts";

export const targetAudienceSchema = z.object({
    job_titles: z.array(z.string()).describe("List of exact target job titles (e.g., 'VP of Sales', 'Chief Technology Officer', 'Head of Fraud')."),
    industry_keywords: z.array(z.string()).describe("List of relevant industry keywords for Apollo (e.g., 'fintech', 'SaaS', 'payments')."),
    company_sizes: z.array(z.string()).describe("List of standard company size brackets (e.g., '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')."),
    locations: z.array(z.string()).describe("Target locations (e.g., 'United States', 'United Kingdom', 'Canada'). Usually default to English-speaking regions unless specified.")  
});

export const campaignTargetingPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an elite B2B Sales Development Representative (SDR) and RevOps strategist. 
    Your task is to analyze a product description and its value propositions, and determine the absolute best target audience to query in Apollo.io for a cold outbound campaign.

    RULES:
    - Job Titles should be specific and decision-maker focused.
    - Industry Keywords should include both broad categories and specific niches.
    - Match the company size to the likely buyer (e.g., enterprise tools need larger company sizes; nimble SaaS might target 11-200).
    - Align the targeting strategy with the requested tone of the campaign ({tone}).
    
    Return ONLY the structured data requested.`
  ],
  [
    "human",
    `Product Description: {product_description}
    
    Value Propositions:
    {value_props}
    
    Campaign Tone: {tone}
    
    Based on the above, suggest the best Apollo search criteria.`
  ]
]);