# ✉️ `src/modules/emails/` - Emails Module

Handles outbound email drafting display, user approval workflow, and Resend API dispatch.

## Expected Files:
* `emails.routes.js`: Express endpoints for reviewing, editing, approving, and sending emails (`/api/emails`).
* `emails.controller.js`: Handles draft approval and manual triggering actions from HTTP requests.
* `emails.service.js`: Manages draft records in PostgreSQL and triggers Resend API for email delivery.
