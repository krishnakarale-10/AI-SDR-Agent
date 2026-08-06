# 🎯 `src/modules/campaigns/` - Campaigns Module

Manages outbound sales campaign settings, targets, schedules, and active status.

## Expected Files:
* `campaigns.routes.js`: Express router for CRUD operations (`GET`, `POST`, `PUT`, `DELETE` `/api/campaigns`).
* `campaigns.controller.js`: Receives HTTP requests and delegates campaign logic to the service layer.
* `campaigns.service.js`: Database queries for creating, updating, activating, or archiving campaigns.
