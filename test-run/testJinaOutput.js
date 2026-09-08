/**
 * testJinaOutput.js — Show full Jina Reader output
 * Usage: node test-run/testJinaOutput.js
 */
import "dotenv/config";

const JINA_READER_BASE = "https://r.jina.ai/";
const TEST_URL = "https://linear.app/blog";

async function main() {
  console.log("📡 Fetching via Jina Reader...");
  console.log(`   URL: ${JINA_READER_BASE}${TEST_URL}\n`);

  const headers = {};
  if (process.env.JINA_API_KEY) {
    headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
  }

  const response = await fetch(`${JINA_READER_BASE}${TEST_URL}`, { headers });
  const rawText = await response.text();

  console.log("═".repeat(60));
  console.log("  RAW JINA OUTPUT (first 3000 chars)");
  console.log("═".repeat(60));
  console.log(rawText.slice(0, 3000));
  console.log("\n... [truncated]");
  console.log("═".repeat(60));
  console.log(`\n📊 Total output length: ${rawText.length} characters`);
}

main();
