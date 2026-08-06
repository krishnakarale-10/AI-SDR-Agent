# 🤖 `src/ai/` - LangChain & LangGraph Brain

Isolated intelligence layer that manages all AI model connections, prompt templates, and LangGraph workflow state machines.

## Expected Files & Folders:
* `client.js`: Initializes the Anthropic / Claude client instance.
* `prompts/`: Structured prompt templates (`research.prompt.js`, `draft-email.prompt.js`, `classify-reply.prompt.js`).
* `graph/state.js`: Defines shared state shape passed across LangGraph nodes.
* `graph/sdr-graph.js`: Compiles nodes and edges into the SDR LangGraph execution machine.
* `graph/nodes/`: Individual executable steps within the LangGraph DAG.
