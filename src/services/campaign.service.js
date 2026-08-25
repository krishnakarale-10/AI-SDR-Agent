import { ChatGroq } from "@langchain/groq";
import {campaignTargetingPrompt,targetAudienceSchema} from "../ai/prompts/campaignTargeting.prompt.js";
import {ApiError} from "../utils/apiErrors.js";
import "dotenv/config";
// import {ApiResponse} from "../utils/apiResponse.js";

export const suggestCampaignTargeting =async (product_description,value_props,tone)=>{
    try {
      const model = new ChatGroq({
      apiKey:process.env.GROQ_API_KEY,
      model: "openai/gpt-oss-120b",
      temperature: 0.2, // Keep it low for precise, analytical JSON output
    });
    const modelWithStructure = model.withStructuredOutput(targetAudienceSchema);

    const chain = campaignTargetingPrompt.pipe(modelWithStructure);

    const result = await chain.invoke({
        product_description,
        value_props:value_props.join("\n- "),
        tone
    });
    return result;
    } catch (error) {
        console.log("AI Targeting Error:", error);
        throw new ApiError(500, "Failed to generate targeting suggestions from AI.");
    }
}