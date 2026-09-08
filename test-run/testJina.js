/**
 * testJina.js — Verify Jina Reader is working
 * Usage: node test-run/testJina.js
 */
import "dotenv/config";
import fetchAndChunk from "../src/ai/tools/Fetchandchunk.js";

const TEST_URLS = [
  // Should WORK — normal blog/news sites
  { url: "https://linear.app/blog", label: "Linear Blog (normal site)" },
  { url: "https://notion.so/blog/introducing-notion-mail", label: "Notion Blog (normal site)" },

  // Should be SKIPPED — blocked sites
  { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", label: "YouTube (blocked)" },
  { url: "https://www.linkedin.com/in/ivanzhao", label: "LinkedIn (blocked)" },
];

async function main() {
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║   JINA READER TEST                                ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  for (const { url, label } of TEST_URLS) {
    console.log(`\n🔍 Testing: ${label}`);
    console.log(`   URL: ${url}`);
    console.log("─".repeat(54));

    const start = Date.now();
    const chunks = await fetchAndChunk(url);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (chunks.length === 0) {
      console.log(`   ❌ No chunks returned (${elapsed}s) — skipped or failed`);
    } else {
      console.log(`   ✅ Got ${chunks.length} chunks (${elapsed}s)`);
      console.log(`   📄 First chunk preview (200 chars):`);
      console.log(`   "${chunks[0].slice(0, 200)}..."`);
    }
    console.log("─".repeat(54));
  }
}

main();
