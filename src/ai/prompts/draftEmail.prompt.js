import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";

export const draftEmailSchema = z.object({
  subject: z
    .string()
    .describe(
      "The email subject line. Short (under 60 characters), specific, non-generic, and written to earn an open — never clickbait, never vague like 'Quick question'."
    ),
  body: z
    .string()
    .describe(
      "The full cold email body, written in plain text (no markdown). Should read as a genuine 1-to-1 message, not a mail-merge template. Every personalized phrase used here MUST have a corresponding entry in the personalization array below, with the phrase text matching EXACTLY (verbatim substring match) so the frontend can highlight it."
    ),
  personalization: z
    .array(
      z.object({
        phrase: z
          .string()
          .describe(
            "The EXACT substring as it appears in body, verbatim, that will be highlighted in the UI. Must be an exact match — no paraphrasing, no truncation."
          ),
        footnote: z
          .string()
          .describe(
            "A short (1 sentence) human-readable explanation of why this phrase was used, shown in the superscript footnote popover."
          ),
        sourceFact: z
          .string()
          .describe(
            "The specific research fact (from company_facts, lead_facts, or personalization_hooks) that justified this phrase. Should be traceable back to the research output, not invented."
          ),
      })
    )
    .describe(
      "2-4 entries mapping personalized phrases used in body back to the research facts that justified them. Every entry's phrase must appear verbatim in body."
    ),
});

export const draftEmailPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an elite B2B SDR who writes cold outbound emails that feel personally written, professional, and compelling.

    RULES:
    - ALWAYS start with a proper personalized greeting (e.g. "Hi {lead_name}," or "Hello {lead_name},").
    - State the clear purpose of the email upfront in the opening paragraph.
    - Write a well-structured, comprehensive email (3-5 well-developed paragraphs) covering the core value propositions, product capabilities, and research insights thoroughly.
    - Write in the specified tone. Never sound like a generic mail-merge template or spam.
    - Use ONLY the research facts provided below to personalize — never invent facts, statistics, or details not present in the research.
    - Every personalized phrase in the body must be paired with an entry in the personalization array, and the phrase text must match EXACTLY (verbatim) what appears in body.
    - End with a clear, low-friction call to action (e.g. an engaging question).
    - Never use spammy language, excessive exclamation marks, ALL CAPS words, or clickbait subject lines.
    - If rewrite feedback is provided (not "N/A"), treat it as direct instruction from a human reviewer and prioritize addressing it over your own instincts.

    Return ONLY the structured data requested.`,
  ],
  [
    "human",
    `Product Description: {product_description}

    Value Propositions:
    {value_props}

    Tone: {tone}

    Lead:
    Name: {lead_name}
    Job Title: {lead_job_title}
    Company: {lead_company}

    Research Summary:
    {research_summary}

    Personalization Hooks:
    {personalization_hooks}

    Rewrite Feedback:
    {rewrite_feedback}

    Based on the above, draft the cold outbound email.`,
  ],
]);

