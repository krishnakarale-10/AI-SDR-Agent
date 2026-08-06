# ⚙️ `src/jobs/` - Async Queue Engine (BullMQ)

Offloads asynchronous long-running AI and email tasks to background BullMQ queues running over Redis.

## Expected Files & Folders:
* `queues.js`: Exports named BullMQ queue instances (`researchQueue`, `emailQueue`, `followUpQueue`).
* `workers.js`: Initializes worker event listeners and links queues to processor files.
* `processors/`: Job execution logic (`research.processor.js`, `draft.processor.js`, `followup.processor.js`).
