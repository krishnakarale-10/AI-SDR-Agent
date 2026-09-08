/**
 * testResearchChain.js
 * -------------------------------------------------------------------
 * Standalone test for runResearchChain — calls the chain with a single
 * realistic mock lead + campaign and prints the structured output.
 *
 * Usage:  node test-run/testResearchChain.js
 * -------------------------------------------------------------------
 */

import "dotenv/config";
import runResearchChain from "../src/ai/chains/research.chain.js";

// ── Mock Data ──────────────────────────────────────────────────────

const mockCampaign = {
  product_description:
    "FlowBoard — a collaborative project-management tool for engineering teams that auto-generates sprint plans from Jira/Linear backlogs, surfaces blockers via AI, and cuts meeting time by 40%.",
  value_props: [
    "Reduces sprint planning time from 2 hours to 15 minutes",
    "AI-generated daily standup summaries replace live standups",
    "Integrates with Jira, Linear, GitHub, and Slack out of the box",
    "Real-time blocker detection with Slack/Teams alerts",
  ],
};

const mockLead = {
  full_name: "Dylan Field",
  job_title: "CEO & Co-founder",
  company: "Figma",
  linkedin: null,
};

// ── Runner ─────────────────────────────────────────────────────────

async function main() {
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║   RESEARCH CHAIN TEST — Single Lead               ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  console.log("Lead :", mockLead.full_name);
  console.log("Title:", mockLead.job_title);
  console.log("Co.  :", mockLead.company);
  console.log("─".repeat(54));
  console.log("Product:", mockCampaign.product_description.slice(0, 80) + "…");
  console.log("─".repeat(54));

  const start = Date.now();

  try {
    console.log("\n⏳ Running research chain…\n");

    const result = await runResearchChain({
      campaign: mockCampaign,
      lead: mockLead,
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log(`\n✅ Research chain completed in ${elapsed}s\n`);
    console.log("═".repeat(54));
    console.log("  STRUCTURED OUTPUT (leadResearchSchema)");
    console.log("═".repeat(54));
    console.log(JSON.stringify(result, null, 2));
    console.log("═".repeat(54));
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`\n❌ Research chain FAILED after ${elapsed}s`);
    console.error("Error:", err.message);
    console.error("Stack:", err.stack);
  }
}

main();
