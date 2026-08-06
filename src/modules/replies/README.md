# 💬 `src/modules/replies/` - Replies Module

Receives and processes incoming email reply webhooks from prospects.

## Expected Files:
* `replies.routes.js`: Public webhook listener endpoint (`POST /api/replies/webhook`) hit by Resend.
* `replies.controller.js`: Validates webhook payloads and triggers classification workflows.
* `replies.service.js`: Processes webhook event payloads, stores reply messages, and triggers AI reply sentiment analysis.
