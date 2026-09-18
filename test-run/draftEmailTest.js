/**
 * draftEmailTest.js
 * -------------------------------------------------------------------
 * Test script for the draftEmail agent / chain using realistic mock data.
 * 
 * Usage: node test-run/draftEmailTest.js
 * -------------------------------------------------------------------
 */

import "dotenv/config";
import runDraftEmailChain from "../src/ai/chains/draftEmail.chain.js";

// ── Realistic Mock Data ─────────────────────────────────────────────

const mockCampaign = {
  product_description:
    "CodeGuard AI is an automated code review platform that analyzes pull requests in real time, catches concurrency bugs and security flaws before merge, and integrates directly with GitHub and GitLab workflows.",
  value_props: [
    "Reduces manual pull request review time by 60%",
    "Catches edge-case concurrency bugs and security vulnerabilities before merge",
    "Auto-generates contextual PR explanations and suggested fixes for reviewers",
  ],
  tone: "friendly and direct",
};

const mockLead = {
  id: "lead_mock_001",
  full_name: "Alex Rivera",
  job_title: "VP of Engineering",
  company: "Traceloop",
  email: "alex.rivera@traceloop.dev",
};

const mockResearchHigh = {
  company_facts: [
    "Traceloop announced general availability of OpenLLMetry in early 2026.",
    "The engineering team scaled to 45 engineers across US and Europe, shipping multiple daily deployments.",
  ],
  lead_facts: [
    "Alex recently spoke on a podcast about balancing shipping velocity with code review rigor in scaling teams.",
    "Alex posted on LinkedIn that keeping PR review turnaround under 2 hours without sacrificing code safety is a top 2026 priority.",
  ],
  likely_pain_points: [
    "Rapid team expansion to 45 engineers → PR bottlenecks slowing sprint velocity and increasing risk of regression bugs.",
  ],
  personalization_hooks: [
    {
      fact: "Alex's podcast discussion on balancing shipping velocity with code review rigor in scaling teams.",
      angle: "CodeGuard AI cuts review turnaround by 60% while catching critical bugs before merge.",
    },
    {
      fact: "Traceloop scaling to 45 engineers shipping multiple daily deployments.",
      angle: "Automated PR reviews ensure consistency across distributed engineers.",
    },
  ],
  summary:
    "Traceloop is scaling quickly to 45 engineers. Alex Rivera is actively tackling code review bottlenecks and aims to keep turnaround fast without lowering quality standards.",
  confidence: "HIGH",
};

// ── Runner ─────────────────────────────────────────────────────────

async function run() {
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║               DRAFT EMAIL AGENT TEST RUN                         ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝\n");

  console.log("Lead    :", mockLead.full_name, `(${mockLead.job_title} @ ${mockLead.company})`);
  console.log("Product :", mockCampaign.product_description.slice(0, 80) + "…");
  console.log("Tone    :", mockCampaign.tone);
  console.log("Research Confidence:", mockResearchHigh.confidence);
  console.log("─".repeat(68));

  const start = Date.now();

  try {
    console.log("\n⏳ Invoking draftEmail chain (OpenRouter)...\n");

    const result = await runDraftEmailChain({
      campaign: mockCampaign,
      lead: mockLead,
      research: mockResearchHigh,
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log(`✅ Draft generated successfully in ${elapsed}s!\n`);
    console.log("═".repeat(68));
    console.log("  OUTPUT METADATA");
    console.log("═".repeat(68));
    console.log("AI Model Used :", result.ai_model);
    console.log("Prompt Version:", result.prompt_version);
    console.log("Subject Line  :", result.subject);

    console.log("\n" + "═".repeat(68));
    console.log("  EMAIL BODY");
    console.log("═".repeat(68));
    console.log(result.body);

    console.log("\n" + "═".repeat(68));
    console.log("  PERSONALIZATION ENTRIES & VERBATIM VALIDATION");
    console.log("═".repeat(68));

    if (result.personalization && result.personalization.length > 0) {
      result.personalization.forEach((item, idx) => {
        const isVerbatim = result.body.includes(item.phrase);
        console.log(`[${idx + 1}] Phrase     : "${item.phrase}"`);
        console.log(`    Verbatim in body? : ${isVerbatim ? "✅ YES" : "❌ NO"}`);
        console.log(`    Footnote : "${item.footnote}"`);
        console.log(`    Source   : "${item.sourceFact}"`);
        console.log("");
      });
    } else {
      console.log("No personalization entries recorded.");
    }

    console.log("═".repeat(68));
    console.log("  COMPLETE STRUCTURED RESULT (JSON)");
    console.log("═".repeat(68));
    console.log(JSON.stringify(result, null, 2));

  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`\n❌ draftEmail agent FAILED after ${elapsed}s:`, err.message);
    console.error(err.stack);
  }
}

run();
