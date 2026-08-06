# 🛡️ `src/middleware/` - Express Middleware Guards

Centralized guards and request processing utilities executed before hitting controller endpoints.

## Expected Files:
* `auth.middleware.js`: JWT access token validation middleware; populates `req.user`.
* `validate.middleware.js`: Generic request payload validator using Zod schemas.
* `rate-limit.middleware.js`: Rate limiting protection for authentication & webhook endpoints.
* `webhook-dedup.middleware.js`: Idempotency guard checking database event IDs to prevent duplicate webhook handling.
* `error.middleware.js`: Global error handling middleware for formatting exceptions cleanly.
