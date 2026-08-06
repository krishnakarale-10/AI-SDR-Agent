# 👤 `src/modules/leads/` - Leads Module

Manages target prospects, lead lists, CSV imports, and third-party data enrichment.

## Expected Files:
* `leads.routes.js`: API endpoints for importing, listing, filtering, and enriching leads (`/api/leads`).
* `leads.controller.js`: Handles lead CRUD HTTP requests and file uploads.
* `leads.service.js`: Database queries for leads and integration with Apollo API for email/LinkedIn enrichment.
