import app from "../src/app.js";
import prisma from "../src/config/prisma.js";
import http from "http";

const PORT = 3055;
const BASE_URL = `http://localhost:${PORT}`;

// Helper UUID regex validator (RFC 4122)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function runTestSuite() {
  console.log("================================================================================");
  console.log("🚀 STARTING AI SDR CAMPAIGN ENDPOINT AUTOMATED TEST SUITE");
  console.log("================================================================================\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`[SETUP] Test Express server listening on ${BASE_URL}\n`);

  let authToken = null;
  let testUser = null;
  const testEmail = `qa_engineer_${Date.now()}@example.com`;
  const testPassword = "Password123";
  const testName = "QA Automation Engineer";

  const results = [];

  try {
    // =========================================================================
    // PHASE 1: SETUP & AUTH
    // =========================================================================
    console.log("--------------------------------------------------------------------------------");
    console.log("📌 PHASE 1: SETUP & AUTHENTICATION");
    console.log("--------------------------------------------------------------------------------");

    // 1. Register test user
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
      }),
    });

    const regData = await regRes.json();
    console.log(`[P1.1] Register User status: ${regRes.status}`, regData);

    // 2. Login test user to acquire access token
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const loginData = await loginRes.json();
    console.log(`[P1.2] Login User status: ${loginRes.status}`, loginData);

    if (loginRes.status === 200 && loginData?.data?.accessToken) {
      authToken = loginData.data.accessToken;
      testUser = loginData.data.user;
      results.push({
        phase: "Phase 1: Setup & Auth",
        test: "User Registration and Login Token Generation",
        status: "PASSED",
        details: `Acquired JWT for user: ${testUser.id} (${testUser.email})`,
      });
      console.log(`✅ Auth Token acquired successfully.\n`);
    } else {
      throw new Error(`Failed to authenticate test user: ${JSON.stringify(loginData)}`);
    }

    // =========================================================================
    // PHASE 2: NEGATIVE TESTING
    // =========================================================================
    console.log("--------------------------------------------------------------------------------");
    console.log("📌 PHASE 2: NEGATIVE TESTING (Validation & Auth Rules)");
    console.log("--------------------------------------------------------------------------------");

    // Test 2.1: No Auth Token
    console.log("[P2.1] Testing POST /api/campaigns WITHOUT Auth Token...");
    const noAuthRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Campaign",
        product_description: "Valid product description text for negative test.",
      }),
    });
    const noAuthData = await noAuthRes.json();
    console.log(`Response status: ${noAuthRes.status}`, noAuthData);

    const is401 = noAuthRes.status === 401;
    results.push({
      phase: "Phase 2: Negative Testing",
      test: "1. No Auth Token (401 Unauthorized)",
      status: is401 ? "PASSED" : "FAILED",
      details: `Expected 401, Got ${noAuthRes.status}. Message: ${noAuthData.message}`,
    });
    console.log(is401 ? "✅ Test 2.1 Passed\n" : "❌ Test 2.1 Failed\n");

    // Test 2.2: Missing Required Fields (Empty Payload {})
    console.log("[P2.2] Testing POST /api/campaigns with Empty Payload {}...");
    const emptyPayloadRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({}),
    });
    const emptyPayloadData = await emptyPayloadRes.json();
    console.log(`Response status: ${emptyPayloadRes.status}`, emptyPayloadData);

    const is400Empty =
      emptyPayloadRes.status === 400 &&
      emptyPayloadData.message.toLowerCase().includes("name") &&
      emptyPayloadData.message.toLowerCase().includes("product_description");

    results.push({
      phase: "Phase 2: Negative Testing",
      test: "2. Missing Required Fields (Empty payload -> 400 Bad Request with name & product_description errors)",
      status: is400Empty ? "PASSED" : "FAILED",
      details: `Expected 400 with missing name & product_description. Got ${emptyPayloadRes.status}. Message: ${emptyPayloadData.message}`,
    });
    console.log(is400Empty ? "✅ Test 2.2 Passed\n" : "❌ Test 2.2 Failed\n");

    // Test 2.3: Invalid Data (Too short: name: "A", product_description: "Too short")
    console.log('[P2.3] Testing POST /api/campaigns with Too Short strings (name: "A", product_description: "Too short")...');
    const shortPayloadRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "A",
        product_description: "Too short",
      }),
    });
    const shortPayloadData = await shortPayloadRes.json();
    console.log(`Response status: ${shortPayloadRes.status}`, shortPayloadData);

    const is400Short =
      shortPayloadRes.status === 400 &&
      shortPayloadData.message.includes("3") &&
      shortPayloadData.message.includes("10");

    results.push({
      phase: "Phase 2: Negative Testing",
      test: "3. Invalid Data - Too Short (name min 3, product_description min 10 -> 400 Bad Request)",
      status: is400Short ? "PASSED" : "FAILED",
      details: `Expected 400 min length validation error. Got ${shortPayloadRes.status}. Message: ${shortPayloadData.message}`,
    });
    console.log(is400Short ? "✅ Test 2.3 Passed\n" : "❌ Test 2.3 Failed\n");

    // =========================================================================
    // PHASE 3: POSITIVE TESTING (THE HAPPY PATH)
    // =========================================================================
    console.log("--------------------------------------------------------------------------------");
    console.log("📌 PHASE 3: POSITIVE TESTING (The Happy Path)");
    console.log("--------------------------------------------------------------------------------");

    const validPayload = {
      name: "Q4 Fintech Campaign",
      product_description:
        "We provide a machine-learning based fraud detection API that reduces chargebacks for e-commerce platforms by 40%.",
      value_props: [
        "Easy API integration",
        "Real-time scoring",
        "No upfront setup fees",
      ],
      tone: "Professional",
    };

    console.log("[P3.1] Sending valid campaign payload:", JSON.stringify(validPayload, null, 2));

    const validRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(validPayload),
    });

    const validData = await validRes.json();
    console.log(`Response status: ${validRes.status}`);
    console.log("Response body:", JSON.stringify(validData, null, 2));

    // Assertion 1: status 201 Created & success === true
    const is201 = validRes.status === 201;
    const assertion1Passed = validData.success === true && is201;
    results.push({
      phase: "Phase 3: Positive Testing",
      test: "Assertion 1: HTTP 201 Created & success: true",
      status: assertion1Passed ? "PASSED" : "FAILED",
      details: `HTTP Status: ${validRes.status}, success field: ${validData.success}`,
    });
    console.log(assertion1Passed ? "✅ Assertion 1 Passed" : "❌ Assertion 1 Failed");

    // Assertion 2: response data MUST ONLY contain id (UUID) and search_criteria (JSON object)
    const responseDataKeys = Object.keys(validData.data || {}).sort();
    const hasOnlyIdAndSearchCriteria =
      responseDataKeys.length === 2 &&
      responseDataKeys.includes("id") &&
      responseDataKeys.includes("search_criteria");

    const isValidUUID = UUID_REGEX.test(validData?.data?.id || "");
    const isSearchCriteriaObject =
      typeof validData?.data?.search_criteria === "object" &&
      validData?.data?.search_criteria !== null;

    const assertion2Passed = hasOnlyIdAndSearchCriteria && isValidUUID && isSearchCriteriaObject;

    results.push({
      phase: "Phase 3: Positive Testing",
      test: "Assertion 2: data object contains ONLY 'id' (UUID) and 'search_criteria' (JSON)",
      status: assertion2Passed ? "PASSED" : "FAILED",
      details: `Keys in data: [${responseDataKeys.join(", ")}], Valid UUID: ${isValidUUID}, Object search_criteria: ${isSearchCriteriaObject}`,
    });
    console.log(assertion2Passed ? "✅ Assertion 2 Passed" : "❌ Assertion 2 Failed");

    // Assertion 3: user_id, created_at, and other database fields MUST NOT be present in frontend response
    const hasSensitiveFields =
      "user_id" in validData.data ||
      "created_at" in validData.data ||
      "updated_at" in validData.data ||
      "deleted_at" in validData.data ||
      "status" in validData.data ||
      "user_id" in validData ||
      "created_at" in validData;

    const assertion3Passed = !hasSensitiveFields;
    results.push({
      phase: "Phase 3: Positive Testing",
      test: "Assertion 3: Internal DB fields (user_id, created_at, status, etc.) are excluded from response",
      status: assertion3Passed ? "PASSED" : "FAILED",
      details: `Forbidden DB fields present in response: ${hasSensitiveFields}`,
    });
    console.log(assertion3Passed ? "✅ Assertion 3 Passed" : "❌ Assertion 3 Failed");

    // Database Verification: Query Prisma directly
    console.log("\n[P3.2] Directly querying Prisma Database to verify persisted record...");
    const createdCampaignId = validData?.data?.id;

    if (!createdCampaignId) {
      throw new Error("No campaign ID returned to verify in database.");
    }

    const dbCampaign = await prisma.campaign.findUnique({
      where: { id: createdCampaignId },
    });

    console.log("Persisted DB Campaign Record:", JSON.stringify(dbCampaign, null, 2));

    const dbVerified =
      dbCampaign !== null &&
      dbCampaign.id === createdCampaignId &&
      dbCampaign.user_id === testUser.id &&
      dbCampaign.name === validPayload.name &&
      dbCampaign.status === "DRAFT" &&
      dbCampaign.tone === validPayload.tone;

    results.push({
      phase: "Phase 3: Database Verification",
      test: "Prisma Direct Query: campaign saved with status: 'DRAFT' and correct user_id",
      status: dbVerified ? "PASSED" : "FAILED",
      details: `Found record ID: ${dbCampaign?.id}, User ID: ${dbCampaign?.user_id} (Expected: ${testUser.id}), Status: ${dbCampaign?.status} (Expected: DRAFT)`,
    });
    console.log(dbVerified ? "✅ Database Verification Passed\n" : "❌ Database Verification Failed\n");

  } catch (error) {
    console.error("❌ Fatal Test Error:", error);
    results.push({
      phase: "Execution Error",
      test: "Test Suite Runner",
      status: "ERROR",
      details: error.message,
    });
  } finally {
    await prisma.$disconnect();
    server.close();
    console.log("Test server stopped.");
  }

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log("\n================================================================================");
  console.log("📊 FINAL QA TEST EXECUTION REPORT");
  console.log("================================================================================");
  console.table(results);

  const allPassed = results.every((r) => r.status === "PASSED");
  console.log(`\nOVERALL TEST RESULT: ${allPassed ? "🎉 ALL TESTS PASSED SUCCESSFULLY" : "⚠️ SOME TESTS FAILED"}\n`);
}

runTestSuite();
