import "dotenv/config";
import { TavilySearch } from "@langchain/tavily";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createAgent } from "langchain";
import { leadResearchPrompt, leadResearchSchema } from "../prompts/research.prompt.js"
import { ChatGroq } from "@langchain/groq";
import { withResilience } from "../../utils/withResilience.js";


const MAX_SEARCHES_PER_LEAD = 4;

const AGENT_RECURSION_LIMIT = 15;

const buildSearchAgentInstructions = () => `You are a B2B sales research agent with a web search tool.
 
Goal: find specific, verifiable, recent facts about a lead and their company
that would help personalize a cold outbound email. Generic descriptions are
not useful — real, specific facts are.
 
How to search:
- You have a HARD LIMIT of ${MAX_SEARCHES_PER_LEAD} searches total — use them
  deliberately. Once the limit is reached, the tool will stop returning
  results, so plan your queries rather than searching one word at a time.
- Prioritize different angles across your limited searches: company
  news/funding, what the company is building or hiring for, and the lead's
  own recent activity or opinions.
- If a product description is provided, spend one search checking whether
  the company shows signs of the pain point that product solves.
- Stop before hitting the limit if you already have strong, specific facts —
  don't burn searches you don't need.
- If searches keep returning nothing useful, say so honestly instead of
  inventing facts.
 
When finished, write a plain-text summary of everything you found. Only
include facts that actually came from your search results.`;

const rawSearchTool = new TavilySearch({
  tavilyApiKey:process.env.TAVILY_API_KEY,
  maxResults: 5,
  topic: "general",
  searchDepth: "basic",
});

const agentModel = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "openai/gpt-oss-120b",
  temperature: 0.2, // Keep it low for precise, analytical JSON output
});

const createLimitedSearchTool = () => {
  let searchCount = 0;
  return tool(
    async ({ query }) => {
      if (searchCount >= MAX_SEARCHES_PER_LEAD) {
        return `Search limit reached (${MAX_SEARCHES_PER_LEAD} searches used). Do not search again — write your summary now using only what you've already found.`;
      }

      searchCount += 1;

      const result = await withResilience(
        () => rawSearchTool.invoke({ query }),
        {
          label: `tavily-search:"${query}"`,
          timeoutMs: 8000,
          retries: 1,
          backoffMs: 500,
          fallback: (err) => `Search failed for "${query}": ${err.message}`,
          onError: (err, attempt) =>
            console.error(`[research.chain] tavily attempt ${attempt} failed:`, err.message),
        }
      );
      return typeof result === "string" ? result : JSON.stringify(result);
    },
    {
      name: "web_search",
      description: `Search the web for facts about a company or person. Limited to ${MAX_SEARCHES_PER_LEAD} calls total — use them deliberately.`,
      schema: z.object({
        query: z.string().describe("The search query."),
      }),
    }
  );
};

const searchForFacts = async ({ campaign, lead }) => {
  const briefing = [
    `Lead: ${lead.full_name}, ${lead.job_title ?? "role unknown"} at ${lead.company ?? "unknown company"}.`,
    lead.linkedin ? `LinkedIn: ${lead.linkedin}` : null,
    `Product being pitched: ${campaign.product_description}`,
    `Value propositions: ${JSON.stringify(campaign.value_props)}`,
    `Please research this lead and their company now.`,
  ]
    .filter(Boolean)
    .join("\n");

  const searchAgent = createAgent({
    model: agentModel,
    tools: [createLimitedSearchTool()],
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
        : (JSON.stringify(content) || "The research agent returned no findings.");
    },
    {
      label: "research-search-agent",
      timeoutMs: 30000, // whole agent loop gets more time than a single search call
      retries: 0, // don't re-run the entire multi-step loop on failure — too expensive
      fallback: (err) => `Web research could not be completed due to an error: ${err.message}`,
      onError: (err) =>
        console.error("[research.chain] search agent failed:", err.message),
    }
  );
};

const structuringModel = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "openai/gpt-oss-120b",
  temperature: 0.2, // Keep it low for precise, analytical JSON output
}).withStructuredOutput(leadResearchSchema);

const structuringChain = leadResearchPrompt.pipe(structuringModel)

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

const runResearchChain = async({campaign,lead})=>{
  const findings = await searchForFacts({ campaign, lead });
  const result = await structureFindings({ campaign, lead, findings });
  return result;
};

export default runResearchChain;  