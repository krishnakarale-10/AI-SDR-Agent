# ⚡ `src/jobs/processors/` - BullMQ Job Processors

Contains the actual background execution logic invoked when BullMQ workers pick up queued jobs.

## Expected Files:
* `research.processor.js`: Executes the LangGraph research lead node in the background.
* `draft.processor.js`: Executes the LangGraph email draft node in the background.
* `followup.processor.js`: Fires scheduled or delayed follow-up outreach tasks.
