# AI SDR Backend

High-performance AI-powered Sales Development Representative (SDR) backend engine built with Node.js, Express, LangChain/LangGraph, BullMQ, Prisma, PostgreSQL, and Redis.

## Project Structure

```
ai-sdr-backend/
├── prisma/
│   └── schema.prisma                  # PostgreSQL models, relationships, and indexes
├── src/
│   ├── config/                        # Shared instance configurations (env, prisma, redis)
│   ├── modules/                       # Feature-based business logic (auth, campaigns, leads, emails, replies, notifications)
│   ├── ai/                            # LangChain & LangGraph Core Brain (client, prompts, graph)
│   ├── jobs/                          # BullMQ Async Queue Engine (queues, workers, processors)
│   ├── middleware/                    # Express global route guards
│   ├── schemas/                       # Zod Validation Schemas
│   ├── utils/                         # Helper utilities
│   ├── server.js                      # Starts Express REST API
│   ├── worker.js                      # Starts BullMQ Queue Workers
│   └── index.js                       # Monolith Bootstrapper (Starts BOTH for Dev)
├── .env.example
├── .env.development
├── jsconfig.json                      # Path aliases (@/src)
└── package.json                       # "type": "module" enabled
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env.development` or `.env`.

3. Run in development mode:
   ```bash
   npm run dev
   ```
hello from krishna