import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";

export const leadResearchSchema = z.object({
  company_facts: z
    .array(z.string())
    .describe(
      "3-5 specific, verifiable, RECENT facts about the lead's company from the search results. Each fact MUST include a date or timeframe (e.g. 'In March 2026, ...'). Prioritize: funding rounds, product launches, major hires, partnerships, or public milestones from the last 6 months. Drop generic boilerplate."
    ),
  lead_facts: z
    .array(z.string())
    .describe(
      "2-4 specific facts about the lead individually — recent public statements, interviews, blog posts, career moves, or opinions found in search results. Include dates when available."
    ),
  likely_pain_points: z
    .array(z.string())
    .describe(
      "2-4 pain points this SPECIFIC lead/company likely faces, each DIRECTLY inferred from a company_fact or lead_fact above combined with the product description. Format: '[Fact reference] → [Pain point]. ' Never write generic pain points like 'teams spend too much time in meetings' — instead tie it to something specific like 'With 3,200 PRs/day (company fact), coordinating sprint planning across that volume likely creates bottlenecks.'"
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
    linkedin_url: z
    .string()
    .nullable()
    .optional()
    .describe("The LinkedIn profile or page URL found for the lead or company, if available in search results, otherwise null."),
  competitor_overlap: z
    .string()
    .nullable()
    .optional()
    .describe("If the lead's company builds a product that directly competes with or overlaps significantly with the product being pitched, describe the overlap here (e.g. 'Notion is a project management tool — pitching FlowBoard (also PM) could seem tone-deaf'). Null if no overlap detected."),
});

export const leadResearchPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an elite B2B sales research analyst. Your job is to read raw web search results about a lead and their company, and extract only the facts that would genuinely help personalize a cold outbound email.

    RULES:
    - Base every fact strictly on the provided search results. Never fabricate, assume, or fill in gaps with generic industry knowledge presented as fact.
    - If the search results are thin, irrelevant, or mostly noise, say so honestly via low confidence and fewer facts — do not pad the output to look thorough.
    - Prioritize recent, specific, and verifiable information (funding, launches, hires, public posts) over generic company-page boilerplate.
    - Include dates or timeframes for every fact when available (e.g. "In March 2026", "Last quarter").
    - Every personalization hook must tie a real fact to the product's value proposition — never a hook that could apply to any company.
    - Pain points MUST be inferred from the specific facts you found, NOT generic industry complaints. Each pain point should reference which fact it came from.
    - COMPETITOR CHECK: If the lead's company builds something that directly competes with or overlaps the product being pitched, flag it in competitor_overlap. This prevents the SDR from embarrassing themselves.
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