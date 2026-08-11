import jwt from "jsonwebtoken";
import { authenticate } from "../src/middleware/auth.middleware.js";
import { refreshAccessToken, logoutUser } from "../src/modules/auth/auth.service.js";
import { generateAccessToken, generateRefreshToken, hashRefreshToken, getRefreshTokenExpiryTime } from "../src/utils/auth.utils.js";
import prisma from "../src/config/prisma.js";


async function runTestSuite() {
  console.log("==================================================");
  console.log("🚀 STARTING AUTOMATED AUTH & REFRESH TOKEN TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const secret = process.env.ACCESS_TOKEN_SECRET || "default_access_token_secret_for_dev";

  // ==========================================
  // SECTION 1: auth.middleware.js TESTS
  // ==========================================
  console.log("\n--- [TEST SUITE 1] auth.middleware ---");

  // 1.1 No token provided
  {
    let nextError = null;
    const req = { cookies: {}, headers: {} };
    const res = {};
    await authenticate(req, res, (err) => { nextError = err; });
    assert(nextError && nextError.statusCode === 401, "Rejects request when no token is provided with 401");
  }

  // 1.2 Invalid / Malformed token
  {
    let nextError = null;
    const req = { cookies: { accessToken: "invalid.jwt.token" }, headers: {} };
    const res = {};
    await authenticate(req, res, (err) => { nextError = err; });
    assert(nextError && nextError.statusCode === 401 && nextError.message.includes("Invalid access token"), "Rejects invalid/malformed JWT with 401");
  }

  // 1.3 Expired token
  {
    let nextError = null;
    const expiredToken = jwt.sign({ id: "user_test_123" }, secret, { expiresIn: "-1s" });
    const req = { cookies: { accessToken: expiredToken }, headers: {} };
    const res = {};
    await authenticate(req, res, (err) => { nextError = err; });
    assert(nextError && nextError.statusCode === 401 && nextError.message.includes("expired"), "Rejects expired JWT with 401 and expiration message");
  }

  // 1.4 Valid token via Authorization Header (Bearer)
  {
    // Mock prisma.user.findUnique
    const originalFindUnique = prisma.user.findUnique;
    prisma.user.findUnique = async ({ where }) => {
      if (where.id === "user_mock_123") {
        return { id: "user_mock_123", name: "John Doe", email: "john@example.com", email_verified: true, daily_send_limit: 50 };
      }
      return null;
    };

    const validToken = generateAccessToken("user_mock_123");
    let nextCalled = false;
    let nextError = null;
    const req = { cookies: {}, headers: { authorization: `Bearer ${validToken}` } };
    const res = {};
    
    await authenticate(req, res, (err) => {
      nextCalled = true;
      nextError = err;
    });

    assert(nextCalled && !nextError && req.user && req.user.id === "user_mock_123", "Authenticates valid Bearer token and populates req.user");
    
    // Restore prisma method
    prisma.user.findUnique = originalFindUnique;
  }

  // ==========================================
  // SECTION 2: refreshAccessToken TESTS
  // ==========================================
  console.log("\n--- [TEST SUITE 2] refreshAccessToken Service ---");

  // 2.1 Missing refresh token
  {
    let caughtErr = null;
    try {
      await refreshAccessToken(null);
    } catch (e) {
      caughtErr = e;
    }
    assert(caughtErr && caughtErr.statusCode === 401, "Throws 401 when refresh token is null/empty");
  }

  // 2.2 Token not found in database
  {
    const originalFindUnique = prisma.refreshToken.findUnique;
    prisma.refreshToken.findUnique = async () => null;

    let caughtErr = null;
    try {
      await refreshAccessToken("non_existent_refresh_token_12345");
    } catch (e) {
      caughtErr = e;
    }
    assert(caughtErr && caughtErr.statusCode === 401 && caughtErr.message.includes("invalid token"), "Throws 401 for non-existent refresh token");
    prisma.refreshToken.findUnique = originalFindUnique;
  }

  // 2.3 Expired refresh token
  {
    const originalFindUnique = prisma.refreshToken.findUnique;
    prisma.refreshToken.findUnique = async () => ({
      id: "rt_expired_1",
      user_id: "user_123",
      token_hash: "hash_expired",
      expires_at: new Date(Date.now() - 10000), // Expired in the past
      revoked: false,
    });

    let caughtErr = null;
    try {
      await refreshAccessToken("any_token_string");
    } catch (e) {
      caughtErr = e;
    }
    assert(caughtErr && caughtErr.statusCode === 401 && caughtErr.message.includes("expired"), "Throws 401 when stored refresh token is expired");
    prisma.refreshToken.findUnique = originalFindUnique;
  }

  // 2.4 Token reuse detection (revoked token)
  {
    const originalFindUnique = prisma.refreshToken.findUnique;
    const originalUpdateMany = prisma.refreshToken.updateMany;
    let updateManyCalled = false;

    prisma.refreshToken.findUnique = async () => ({
      id: "rt_revoked_1",
      user_id: "user_compromised_123",
      token_hash: "hash_revoked",
      expires_at: new Date(Date.now() + 100000),
      revoked: true, // Already revoked!
    });
    prisma.refreshToken.updateMany = async ({ where, data }) => {
      if (where.user_id === "user_compromised_123" && data.revoked === true) {
        updateManyCalled = true;
      }
      return { count: 2 };
    };

    let caughtErr = null;
    try {
      await refreshAccessToken("reused_token_string");
    } catch (e) {
      caughtErr = e;
    }
    assert(caughtErr && caughtErr.statusCode === 401 && caughtErr.message.includes("revoked") && updateManyCalled, "Security: Detects token reuse and revokes all user sessions");
    prisma.refreshToken.findUnique = originalFindUnique;
    prisma.refreshToken.updateMany = originalUpdateMany;
  }

  // 2.5 Successful Token Refresh & Rotation
  {
    const originalFindUnique = prisma.refreshToken.findUnique;
    const originalTransaction = prisma.$transaction;

    const rawToken = "raw_valid_refresh_token_abc";
    const hashed = hashRefreshToken(rawToken);

    prisma.refreshToken.findUnique = async ({ where }) => {
      if (where.token_hash === hashed) {
        return {
          id: "rt_valid_1",
          user_id: "user_valid_456",
          token_hash: hashed,
          expires_at: new Date(Date.now() + 1000000),
          revoked: false,
        };
      }
      return null;
    };

    let transactionExecuted = false;
    prisma.$transaction = async (promises) => {
      transactionExecuted = true;
      return promises;
    };

    const result = await refreshAccessToken(rawToken);

    assert(
      result &&
      typeof result.newRefreshToken === "string" &&
      typeof result.newAccessToken === "string" &&
      transactionExecuted,
      "Successfully refreshes and rotates tokens via atomic transaction"
    );

    // Verify the new access token contains user_id
    const decodedNewAccess = jwt.verify(result.newAccessToken, secret);
    assert(
      (decodedNewAccess.id === "user_valid_456" || decodedNewAccess.sub === "user_valid_456"),
      "New access token correctly encodes the user ID in payload"
    );

    prisma.refreshToken.findUnique = originalFindUnique;
    prisma.$transaction = originalTransaction;
  }

  // ==========================================
  // SECTION 3: logoutUser Service TESTS
  // ==========================================
  console.log("\n--- [TEST SUITE 3] logoutUser Service ---");

  // 3.1 Revoking token on logout
  {
    const originalUpdateMany = prisma.refreshToken.updateMany;
    let revokedTokenHash = null;
    let revokedStatus = null;

    const testToken = "test_logout_refresh_token_xyz";
    const expectedHash = hashRefreshToken(testToken);

    prisma.refreshToken.updateMany = async ({ where, data }) => {
      revokedTokenHash = where.token_hash;
      revokedStatus = data.revoked;
      return { count: 1 };
    };

    const res = await logoutUser(testToken);

    assert(
      res && res.success === true &&
      revokedTokenHash === expectedHash &&
      revokedStatus === true,
      "logoutUser successfully marks refresh token as revoked in database"
    );

    prisma.refreshToken.updateMany = originalUpdateMany;
  }

  // 3.2 Calling logout with null/empty token gracefully handles it
  {
    const res = await logoutUser(null);
    assert(res && res.success === true, "logoutUser handles empty/null token gracefully without crashing");
  }

  console.log("\n==================================================");
  console.log(`📊 FINAL RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test Suite encountered an unexpected error:", err);
  process.exit(1);
});
