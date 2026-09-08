import "dotenv/config";
import { buildSdrGraph } from "../src/ai/graph/sdrGraph.js";

const graph = buildSdrGraph();

const CAMPAIGN_ID = "9036c5fe-b376-4a6d-a827-a17e9e2644b7";
const LEAD_ID = "29dff194-e213-464f-b3df-bd7b3d4d03ca";

async function run() {
  try {
    console.log(`Starting SDR Graph for Campaign: ${CAMPAIGN_ID}, Lead: ${LEAD_ID}...\n`);
    const result = await graph.invoke(
      { campaignId: CAMPAIGN_ID, leadId: LEAD_ID },
      { configurable: { thread_id: "test-2" } }
    );

    console.log("=== SDR Graph Result ===");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Graph execution failed:", error);
  }
}

run();
