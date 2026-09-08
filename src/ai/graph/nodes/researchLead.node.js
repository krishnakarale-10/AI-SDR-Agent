import prisma from "../../../config/prisma.js";
import runResearchChain from "../../chains/research.chain.js";

const PROMPT_VERSION = "research-v1";

export const researchLead = async (state) => {
    const { campaign, lead } = state;
    try {
        const research = await runResearchChain({ campaign, lead });

        await prisma.leadResearch.create({
            data: {
                lead_id: lead.id,
                ai_model: process.env.GROQ_RESEARCH_MODEL || "openai/gpt-oss-120b",
                research: research,
                prompt_version: PROMPT_VERSION,
            },
        });

        return {
            research,
        };
    } catch (err) {
        const fallbackResearch = {
            company_facts: [],
            lead_facts: [],
            likely_pain_points: [],
            personalization_hooks: [],
            summary: "Research failed to complete — proceed with generic personalization only.",
            confidence: "LOW",
        };

        return {
            research: fallbackResearch,
            errors: [
                {
                    node: "researchLead",
                    message: err.message,
                    at: new Date().toISOString(),
                },
            ],
        };
    }
};

export default researchLead;