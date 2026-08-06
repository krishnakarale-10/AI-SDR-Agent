# 🔌 `src/config/` - Shared Instance Connections

Holds singleton connection initializations and environment validation logic for external services.

## Expected Files:
* `env.js`: Zod-validated environment variables. Fails fast at boot if required keys (like `ANTHROPIC_API_KEY`, `DATABASE_URL`) are missing.
* `prisma.js`: Singleton `PrismaClient` instance shared across all services to prevent connection pool exhaustion.
* `redis.js`: Singleton `ioredis` connection instance used by BullMQ for background job processing.
