import "dotenv/config";
import runResearchChain from "../src/ai/chains/research.chain.js";

async function main() {
  console.log("=== 1. Checking Environment Variables ===");
  const groqKey = process.env.GROQ_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;

  if (!groqKey) {
    console.error("❌ Missing required environment variable: GROQ_API_KEY");
    process.exit(1);
  }
  if (!tavilyKey) {
    console.error("❌ Missing required environment variable: TAVILY_API_KEY");
    process.exit(1);
  }
  console.log("✅ GROQ_API_KEY and TAVILY_API_KEY are present.\n");

  const mockCampaign = {
    product_description:
      "Enterprise developer telemetry and error tracking platform that correlates frontend exceptions with backend distributed traces and database query latencies.",
    value_props: [
      "Zero-overhead eBPF tracing with real-time alerting",
      "Reduces Mean Time to Resolution (MTTR) by 60%",
      "Automated root-cause analysis across microservices"
    ],
  };

  const mockLead = {
    full_name: "James Hawkins",
    job_title: "CEO & Co-founder",
    company: "PostHog",
    linkedin: "https://www.linkedin.com/in/james-hawkins-posthog",
  };

  console.log("=== 2. Running Research Chain ===");
  console.log("Mock Lead:", JSON.stringify(mockLead, null, 2));
  console.log("Mock Campaign:", JSON.stringify(mockCampaign, null, 2));
  console.log("\nExecuting runResearchChain...\n");

  const startTime = Date.now();
  try {
    const result = await runResearchChain({
      campaign: mockCampaign,
      lead: mockLead,
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("=== 3. Full Returned Object ===");
    console.log(JSON.stringify(result, null, 2));
    console.log(`\nExecution time: ${duration}s\n`);

    console.log("=== 4. Validating Schema Shape ===");
    const checks = [
      {
        field: "company_facts",
        pass: Array.isArray(result?.company_facts),
        count: result?.company_facts?.length,
      },
      {
        field: "lead_facts",
        pass: Array.isArray(result?.lead_facts),
        count: result?.lead_facts?.length,
      },
      {
        field: "likely_pain_points",
        pass: Array.isArray(result?.likely_pain_points),
        count: result?.likely_pain_points?.length,
      },
      {
        field: "personalization_hooks",
        pass:
          Array.isArray(result?.personalization_hooks) &&
          result.personalization_hooks.every(
            (h) => typeof h?.fact === "string" && typeof h?.angle === "string"
          ),
        count: result?.personalization_hooks?.length,
      },
      {
        field: "summary",
        pass: typeof result?.summary === "string" && result.summary.length > 0,
      },
      {
        field: "confidence",
        pass: ["HIGH", "MEDIUM", "LOW"].includes(result?.confidence),
        value: result?.confidence,
      },
    ];

    let allPassed = true;
    for (const check of checks) {
      if (check.pass) {
        console.log(
          `  ✅ ${check.field}: PASS (${check.count !== undefined ? `${check.count} items` : check.value})`
        );
      } else {
        allPassed = false;
        console.log(`  ❌ ${check.field}: FAIL`);
      }
    }

    console.log("\n=== 5. Final Result ===");
    if (allPassed) {
      console.log("🎉 Schema Validation Passed completely!");
    } else {
      console.log("⚠️ Schema Validation had failures.");
    }
  } catch (error) {
    console.error("❌ Error executing runResearchChain:", error);
    process.exit(1);
  }
}

main();
