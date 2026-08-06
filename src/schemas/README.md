# 📐 `src/schemas/` - Zod Runtime Validation Schemas

Defines runtime Zod validation schemas for request bodies, query parameters, and LLM JSON output guarantees.

## Expected Files:
* `auth.schema.js`: Validation rules for login, signup, and password reset payloads.
* `campaign.schema.js`: Validation rules for creating and editing sales campaigns.
* `lead.schema.js`: Validation rules for single lead objects and bulk lead imports.
* `ai-output.schema.js`: Strict validation schema ensuring Claude JSON responses match exact data structures.
