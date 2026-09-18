import "dotenv/config";
import { TavilySearch } from "@langchain/tavily";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createAgent } from "langchain";
import { leadResearchPrompt, leadResearchSchema } from "../prompts/research.prompt.js";
import { ChatGroq } from "@langchain/groq";
import { withResilience } from "../../utils/withResilience.js";
import rerankChunks from "../tools/reranker.js";
import fetchAndChunk from "../tools/Fetchandchunk.js";
import { ChatGoogle } from "@langchain/google";
import { ChatOpenRouter } from "@langchain/openrouter";

// Configurable search caps and pipeline parameters
const MAX_SEARCHES_PER_LEAD = Number(process.env.RESEARCH_MAX_SEARCHES) || 2;
const AGENT_RECURSION_LIMIT = 15;
const URLS_TO_FETCH_PER_SEARCH = 3;

// DeepSeek Model for Research via OpenRouter
const RESEARCH_MODEL = process.env.RESEARCH_MODEL || "deepseek/deepseek-chat";

// System prompt guiding the research agent to gather factual, verifiable data
const buildSearchAgentInstructions = () => `You are a B2B sales research agent with a web search tool.

Goal: find specific, verifiable, RECENT facts about a lead and their company
that would help personalize a cold outbound email. Generic company descriptions
are useless — real, dated, specific facts are what matter.

SEARCH STRATEGY (you have ${MAX_SEARCHES_PER_LEAD} searches — plan them):

  Search 1 — COMPANY INTELLIGENCE:
  Query pattern: "{company name} news funding launch hiring 2025 2026"
  Goal: recent funding rounds, product launches, partnerships, hiring pushes,
  or public milestones from the LAST 6 MONTHS. Ignore anything older unless
  it's a landmark event (e.g. founding story, IPO).

  Search 2 — LEAD PERSONAL ACTIVITY:
  Query pattern: "{lead name} {company} interview podcast opinion linkedin 2025 2026"
  Goal: the lead's recent public statements, blog posts, podcast appearances,
  tweets, or LinkedIn posts. What do they care about? What have they said?

SEARCH RULES:
- Always include the current year (2026) or recent years in your queries to
  bias results toward recent content.
- If a product description is provided, look for signs the company has the
  pain point the product solves.
- Stop early if you already have 3+ strong, specific, dated facts.
- If searches return nothing useful, say so honestly — never invent facts.
- Do NOT waste a search on generic queries like just the company name alone.

OUTPUT:
Write a plain-text summary of everything you found. For each fact, mention
the approximate date or timeframe if available. Only include facts that
actually came from your search results.`;

// Base web search client
const rawSearchTool = new TavilySearch({
  tavilyApiKey: process.env.TAVILY_API_KEY,
  maxResults: 5,
  topic: "general",
  searchDepth: "advanced",
});

// Primary LLM used by the ReAct search agent (DeepSeek via OpenRouter)
const agentModel = new ChatOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  model: RESEARCH_MODEL,
  temperature: 0.2,
});

// Fetches full page content, splits into chunks, and reranks using Cohere
const buildRankedContext = async (query, tavilyResults) => {
  const topResults = tavilyResults.slice(0, URLS_TO_FETCH_PER_SEARCH);

  const chunkGroups = await Promise.all(
    topResults.map(async (r) => {
      // Sites that block server-side scrapers — use Tavily snippet directly
      const SCRAPER_BLOCKED_SITES = ["linkedin.com", "youtube.com", "twitter.com", "x.com", "facebook.com", "instagram.com", "glassdoor.com"];
      const blockedMatch = SCRAPER_BLOCKED_SITES.find((site) => r.url?.includes(site));
      if (blockedMatch) {
        const snippet = (r.content || "").slice(0, 600);
        return snippet ? [`[Source: ${r.url}]\n${snippet}`] : [];
      }

      const chunks = await fetchAndChunk(r.url);
      // Fall back to Tavily snippet if page fetching fails
      return chunks.length > 0 ? chunks : [(r.content || "").slice(0, 600)];
    })
  );

  const allChunks = chunkGroups.flat().filter(Boolean);

  if (allChunks.length === 0) {
    return "No usable content could be retrieved for this query.";
  }

  // Rerank all collected chunks to extract the most relevant snippets
  const topChunks = await rerankChunks(query, allChunks);

  return topChunks.map((chunk, i) => `[${i + 1}] ${chunk}`).join("\n\n");
};

// Tool factory that enforces a strict per-lead search limit and adds resilience
const createLimitedSearchTool = (discoveredUrls = {}) => {
  let searchCount = 0;
  return tool(
    async ({ query }) => {
      // Enforce hard cap on searches
      if (searchCount >= MAX_SEARCHES_PER_LEAD) {
        return `Search limit reached (${MAX_SEARCHES_PER_LEAD} searches used). Do not search again — write your summary now using only what you've already found.`;
      }

      searchCount += 1;

      // Execute search with timeout and retry resilience
      const result = await withResilience(
        () => rawSearchTool.invoke({ query }),
        {
          label: `tavily-search:"${query}"`,
          timeoutMs: 15000,
          retries: 1,
          backoffMs: 500,
          fallback: (err) => ({ results: [], _failed: true, _message: err.message }),
          onError: (err, attempt) =>
            console.error(`[research.chain] tavily attempt ${attempt} failed:`, err.message),
        }
      );

      if (result?._failed) {
        return `Search failed for "${query}": ${result._message}`;
      }

      const tavilyResults = Array.isArray(result?.results) ? result.results : [];

      if (tavilyResults.length === 0) {
        return `No results found for "${query}".`;
      }

      // Capture discovered LinkedIn URL so it can be stored in the database
      for (const item of tavilyResults) {
        if (item.url && item.url.includes("linkedin.com") && !discoveredUrls.linkedin_url) {
          discoveredUrls.linkedin_url = item.url;
        }
      }

      // Fetch, chunk, and rerank search results
      return buildRankedContext(query, tavilyResults);
    },
    {
      name: "company_intelligence_lookup",
      description: `Search the web for facts about a company or person. Limited to ${MAX_SEARCHES_PER_LEAD} calls total — use them deliberately.`,
      schema: z.object({
        query: z.string().describe("The search query."),
      }),
    }
  );
};

// Step 1: Agent explores the web and produces unstructured findings
const searchForFacts = async ({ campaign, lead, discoveredUrls = {} }) => {
  const briefing = [
    `Lead: ${lead.full_name}, ${lead.job_title ?? "role unknown"} at ${lead.company ?? "unknown company"}.`,
    lead.linkedin ? `LinkedIn: ${lead.linkedin}` : null,
    `Product being pitched: ${campaign.product_description}`,
    `Value propositions: ${JSON.stringify(campaign.value_props)}`,
    `Please research this lead and their company now.`,
  ]
    .filter(Boolean)
    .join("\n");

  // Create isolated agent with per-run limited search tool
  const searchAgent = createAgent({
    model: agentModel,
    tools: [createLimitedSearchTool(discoveredUrls)],
    systemPrompt: buildSearchAgentInstructions(),
  });

  return withResilience(
    async () => {
      const { messages } = await searchAgent.invoke(
        {
          messages: [{ role: "user", content: briefing }],
        },
        { recursionLimit: AGENT_RECURSION_LIMIT }
      );

      const finalMessage = messages[messages.length - 1];
      const content = finalMessage?.content;
      return typeof content === "string"
        ? content
        : (content ? JSON.stringify(content) : "The research agent returned no findings.");
    },
    {
      label: "research-search-agent",
      timeoutMs: 150000,
      retries: 0,
      fallback: (err) => `Web research could not be completed due to an error: ${err.message}`,
      onError: (err) =>
        console.error("[research.chain] search agent failed:", err.message),
    }
  );
};

// Step 2: Structuring model parses unstructured findings into strict schema (DeepSeek via OpenRouter)
const structuringModel = new ChatOpenRouter({
  apiKey: process.env.GROQ_API_KEY,
  model: "openai/gpt-oss-120b",
  temperature: 0.2,
}).withStructuredOutput(leadResearchSchema);

const structuringChain = leadResearchPrompt.pipe(structuringModel);

// Formats unstructured findings into typed leadResearchSchema
const structureFindings = async ({ campaign, lead, findings }) => {
  return structuringChain.invoke({
    product_description: campaign.product_description,
    value_props: JSON.stringify(campaign.value_props),
    lead_name: lead.full_name,
    lead_job_title: lead.job_title ?? "Unknown",
    lead_company: lead.company ?? "Unknown",
    search_results: findings,
  });
};

// Main entry point: runs search agent and formats findings
export const runResearchChain = async ({ campaign, lead }) => {
  const discoveredUrls = { linkedin_url: lead?.linkedin || null };
  const findings = await searchForFacts({ campaign, lead, discoveredUrls });
  const result = await structureFindings({ campaign, lead, findings });

  // Attach discovered LinkedIn URL to result for database storage
  if (!result.linkedin_url && discoveredUrls.linkedin_url) {
    result.linkedin_url = discoveredUrls.linkedin_url;
  }

  return result;
};

export default runResearchChain;

/**
 * ============================================================================
 * AGENT WORKFLOW OVERVIEW
 * ============================================================================
 *
 * 1. INPUT:
 *    - Receives { campaign, lead } with lead details (name, title, company,
 *      LinkedIn) and campaign value propositions / product description.
 *
 * 2. STEP 1 — FACT DISCOVERY (searchForFacts):
 *    - Builds a targeted research briefing for the lead and company.
 *    - Initializes an isolated search agent with createLimitedSearchTool().
 *    - Deep Web Search & Reranking Cycle:
 *        a. Executes Tavily search with resilience (timeout, backoff, retries).
 *        b. Enforces hard cap (MAX_SEARCHES_PER_LEAD) to prevent runaway costs.
 *        c. Fetches full page content for top URLs via Jina Reader (fetchAndChunk).
 *        d. Splits page content into manageable chunks (falls back to snippet on error).
 *        e. Reranks all chunks against the query using Cohere (rerankChunks).
 *        f. Supplies only top relevant chunks back to the agent LLM.
 *    - The agent synthesizes all gathered evidence into a factual text summary.
 *
 * 3. STEP 2 — STRUCTURED EXTRACTION (structureFindings):
 *    - Sends the raw findings to structuringModel (DeepSeek via ChatOpenRouter).
 *    - Enforces strict validation matching leadResearchSchema:
 *        - company_facts: Verifiable company milestones, products, hiring
 *        - lead_facts: Individual background, seniority, recent activities
 *        - likely_pain_points: Challenges related to campaign pitch
 *        - personalization_hooks: Concrete facts mapped to outreach angles
 *        - summary & confidence: Confidence score (HIGH/MEDIUM/LOW)
 *
 * 4. OUTPUT:
 *    - Returns schema-compliant JSON object for downstream personalization.
 * ============================================================================
 */  