/**
 * combinedPipelineTest.js
 * -------------------------------------------------------------------
 * End-to-End Fail-Fast Test for Research Agent + Email Draft Agent:
 * 1. STAGE 1 (Research Agent): Web search (Tavily), scraper (Jina),
 *    reranker (Cohere), and structured facts (OpenRouter DeepSeek).
 *    -> STOPS IMMEDIATELY if Stage 1 fails or returns unhandled errors.
 * 2. STAGE 2 (Draft Email Agent): Personalization & email generation (OpenRouter).
 *    -> STOPS IMMEDIATELY if Stage 2 fails or produces invalid drafts.
 *
 * Usage: node test-run/combinedPipelineTest.js
 * -------------------------------------------------------------------
 */

import "dotenv/config";
import assert from "node:assert";
import runResearchChain from "../src/ai/chains/research.chain.js";
import runDraftEmailChain from "../src/ai/chains/draftEmail.chain.js";

const mockCampaign = {
  name: "FlowBoard AI Outbound Campaign",
  product_description:
    "FlowBoard is an AI-driven project management & sprint automation tool for engineering teams. It auto-generates sprint backlogs from GitHub/Linear activity, surfaces cross-team blockers before standups, and reduces sprint planning overhead by 50%.",
  value_props: [
    "Cuts weekly sprint planning overhead from 2 hours to 20 minutes",
    "Real-time AI blocker detection via GitHub & Slack integration",
    "Eliminates manual status updates by auto-syncing Jira and Linear",
  ],
  tone: "direct, concise, and professional",
};

const mockLead = {
  full_name: "Dylan Field",
  job_title: "CEO & Co-founder",
  company: "Figma",
  linkedin: null,
};

async function runCombinedPipeline() {
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  STRICT COMBINED PIPELINE TEST — RESEARCH AGENT + DRAFT EMAIL    ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝\n");

  console.log("📍 TARGET LEAD:");
  console.log(`   Name   : ${mockLead.full_name}`);
  console.log(`   Title  : ${mockLead.job_title}`);
  console.log(`   Company: ${mockLead.company}`);
  console.log("\n📍 PITCHED PRODUCT:");
  console.log(`   Product: ${mockCampaign.name}`);
  console.log(`   Pitch  : ${mockCampaign.product_description}`);
  console.log("─".repeat(68));

  const pipelineStart = Date.now();

  // ════════════════════════════════════════════════════════════════
  // STAGE 1: RESEARCH AGENT
  // ════════════════════════════════════════════════════════════════
  console.log("\n🔎 [STAGE 1] Running Research Agent (Tavily + Jina + Cohere + DeepSeek)...");
  const researchStart = Date.now();
  let researchResult;

  try {
    researchResult = await runResearchChain({
      campaign: mockCampaign,
      lead: mockLead,
    });
  } catch (err) {
    const elapsed = ((Date.now() - researchStart) / 1000).toFixed(1);
    console.error(`\n❌ STAGE 1 (RESEARCH AGENT) CRITICAL FAILURE after ${elapsed}s!`);
    console.error(`Error: ${err.message}`);
    console.error(err.stack);
    console.error("\n⛔ PIPELINE HALTED AT STAGE 1.");
    process.exit(1);
  }

  const researchElapsed = ((Date.now() - researchStart) / 1000).toFixed(1);

  if (!researchResult || typeof researchResult !== "object") {
    console.error(`\n❌ STAGE 1 FAILED: Invalid or null research output.`);
    console.error("\n⛔ PIPELINE HALTED AT STAGE 1.");
    process.exit(1);
  }

  console.log(`\n✅ Stage 1 Completed Successfully in ${researchElapsed}s!`);
  console.log("─".repeat(68));
  console.log("📊 RESEARCH AGENT OUTPUT (leadResearchSchema):");
  console.log(`   Confidence      : ${researchResult.confidence}`);
  console.log(`   Summary         : ${researchResult.summary}`);
  console.log(`   Company Facts   : ${researchResult.company_facts?.length || 0} facts found`);
  if (researchResult.company_facts?.length) {
    researchResult.company_facts.forEach((f, i) => console.log(`      • [${i + 1}] ${f}`));
  }
  console.log(`   Lead Facts      : ${researchResult.lead_facts?.length || 0} facts found`);
  if (researchResult.lead_facts?.length) {
    researchResult.lead_facts.forEach((f, i) => console.log(`      • [${i + 1}] ${f}`));
  }
  console.log(`   Likely Pain Pts : ${researchResult.likely_pain_points?.length || 0} items`);
  if (researchResult.likely_pain_points?.length) {
    researchResult.likely_pain_points.forEach((p, i) => console.log(`      • [${i + 1}] ${p}`));
  }
  console.log(`   Hooks           : ${researchResult.personalization_hooks?.length || 0} hooks`);
  if (researchResult.personalization_hooks?.length) {
    researchResult.personalization_hooks.forEach((h, i) =>
      console.log(`      • [${i + 1}] Fact: "${h.fact}" → Angle: "${h.angle}"`)
    );
  }
  console.log("─".repeat(68));

  // Assert basic Stage 1 output shape
  try {
    assert.ok(Array.isArray(researchResult.company_facts), "company_facts must be an array");
    assert.ok(Array.isArray(researchResult.lead_facts), "lead_facts must be an array");
    assert.ok(["HIGH", "MEDIUM", "LOW"].includes(researchResult.confidence), "Invalid confidence value");
  } catch (assertErr) {
    console.error(`\n❌ STAGE 1 ASSERTION FAILURE: ${assertErr.message}`);
    console.error("\n⛔ PIPELINE HALTED AT STAGE 1.");
    process.exit(1);
  }

  // ════════════════════════════════════════════════════════════════
  // STAGE 2: DRAFT EMAIL AGENT
  // ════════════════════════════════════════════════════════════════
  console.log("\n✉️ [STAGE 2] Running Draft Email Agent with Research Output (OpenRouter)...");
  const draftStart = Date.now();
  let draftResult;

  try {
    draftResult = await runDraftEmailChain({
      campaign: mockCampaign,
      lead: mockLead,
      research: researchResult,
    });
  } catch (err) {
    const elapsed = ((Date.now() - draftStart) / 1000).toFixed(1);
    console.error(`\n❌ STAGE 2 (DRAFT EMAIL AGENT) CRITICAL FAILURE after ${elapsed}s!`);
    console.error(`Error: ${err.message}`);
    console.error(err.stack);
    console.error("\n⛔ PIPELINE HALTED AT STAGE 2.");
    process.exit(1);
  }

  const draftElapsed = ((Date.now() - draftStart) / 1000).toFixed(1);
  const totalElapsed = ((Date.now() - pipelineStart) / 1000).toFixed(1);

  console.log(`\n✅ Stage 2 Completed Successfully in ${draftElapsed}s! (Total Pipeline Time: ${totalElapsed}s)`);
  console.log("═".repeat(68));
  console.log("📧 DRAFT EMAIL AGENT OUTPUT:");
  console.log("═".repeat(68));
  console.log(`AI Model Used : ${draftResult.ai_model}`);
  console.log(`Prompt Version: ${draftResult.prompt_version}`);
  console.log(`Subject       : ${draftResult.subject}\n`);
  console.log("BODY:");
  console.log("--------------------------------------------------------------------");
  console.log(draftResult.body);
  console.log("--------------------------------------------------------------------");

  console.log("\n🔍 PERSONALIZATION FOOTNOTE MAPPINGS & VERBATIM VALIDATION:");
  try {
    assert.ok(typeof draftResult.subject === "string" && draftResult.subject.length > 0, "Subject is empty");
    assert.ok(typeof draftResult.body === "string" && draftResult.body.length > 0, "Body is empty");
    assert.ok(Array.isArray(draftResult.personalization), "Personalization is not an array");

    if (draftResult.personalization.length > 0) {
      draftResult.personalization.forEach((p, idx) => {
        const isVerbatim = draftResult.body.includes(p.phrase);
        console.log(`\n  [Hook ${idx + 1}]`);
        console.log(`  Highlighted Phrase : "${p.phrase}"`);
        console.log(`  Verbatim Substring : ${isVerbatim ? "✅ PASS" : "❌ FAIL"}`);
        console.log(`  Footnote Popover   : "${p.footnote}"`);
        console.log(`  Underlying Fact    : "${p.sourceFact}"`);

        assert.strictEqual(
          isVerbatim,
          true,
          `Personalization phrase "${p.phrase}" MUST be an exact verbatim substring of body!`
        );
      });
    } else {
      console.log("  (No personalization phrases highlighted)");
    }
  } catch (assertErr) {
    console.error(`\n❌ STAGE 2 ASSERTION FAILURE: ${assertErr.message}`);
    console.error("\n⛔ PIPELINE HALTED AT STAGE 2.");
    process.exit(1);
  }

  console.log("\n═".repeat(68));
  console.log("🎉 ALL PIPELINE STAGES COMPLETED & VERIFIED SUCCESSFULLY!");
  console.log("═".repeat(68));
}

runCombinedPipeline();
