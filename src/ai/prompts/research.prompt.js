import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";

export const leadResearchSchema = z.object({
  company_facts: z
    .array(z.string())
    .describe(
      "Specific, verifiable facts about the lead's company found in the search results (e.g. recent funding round, product launch, hiring push, news mention). Each fact must be traceable to the provided search context — never invent one."
    ),
  lead_facts: z
    .array(z.string())
    .describe(
      "Specific facts about the lead individually — their role, responsibilities, recent posts, career moves, or public statements found in the search results."
    ),
  likely_pain_points: z
    .array(z.string())
    .describe(
      "Pain points this lead/company likely faces that are relevant to the product being pitched, inferred from the facts above plus the product description — not generic industry pain points."
    ),
  personalization_hooks: z
    .array(
      z.object({
        fact: z.string().describe("The specific fact to reference in the email."),
        angle: z
          .string()
          .describe("How this fact connects to the product's value proposition — the 'why this matters to them' angle."),
      })
    )
    .describe(
      "2-4 of the strongest facts to actually use in the cold email, each paired with the angle that ties it back to the product."
    ),
  summary: z
    .string()
    .describe("A 2-3 sentence summary of the research, written for a human reviewer skimming the AI Research Notes panel."),
  confidence: z
    .enum(["HIGH", "MEDIUM", "LOW"])
    .describe(
      "HIGH if search results returned solid, specific, verifiable information. LOW if search results were sparse, generic, or largely irrelevant — signals the drafter should personalize more conservatively."
    ),
});

export const leadResearchPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an elite B2B sales research analyst. Your job is to read raw web search results about a lead and their company, and extract only the facts that would genuinely help personalize a cold outbound email.

    RULES:
    - Base every fact strictly on the provided search results. Never fabricate, assume, or fill in gaps with generic industry knowledge presented as fact.
    - If the search results are thin, irrelevant, or mostly noise, say so honestly via low confidence and fewer facts — do not pad the output to look thorough.
    - Prioritize recent, specific, and verifiable information (funding, launches, hires, public posts) over generic company-page boilerplate.
    - Every personalization hook must tie a real fact to the product's value proposition — never a hook that could apply to any company.
    - Write for a busy SDR who will skim this before approving an email, not for a report.

    Return ONLY the structured data requested.`,
  ],
  [
    "human",
    `Product Description: {product_description}

    Value Propositions:
    {value_props}

    Lead:
    Name: {lead_name}
    Job Title: {lead_job_title}
    Company: {lead_company}

    Raw Web Search Results:
    {search_results}

    Based on the above, extract the research findings.`,
  ],
]);

export default leadResearchPrompt;