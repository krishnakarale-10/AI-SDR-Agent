import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import loadContext from "./nodes/loadContext.node.js";
import researchLead from "./nodes/researchLead.node.js";
import SDRGraphState  from "./state.js";
import draftEmail from "./nodes/draftEmail.node.js";

const buildSdrGraph =({checkPointer}={})=>{
  const graph = new StateGraph(SDRGraphState)
  .addNode('loadContext',loadContext)
  .addNode("researchLead",researchLead)
  .addNode('draftEmail',draftEmail)
  .addEdge(START, 'loadContext')
  .addEdge('loadContext', 'researchLead')
  .addEdge('researchLead', 'draftEmail')
  .addEdge('draftEmail', END);
  
  return graph.compile({ checkPointer: checkPointer ? checkPointer : new MemorySaver() });
};

export { buildSdrGraph };
export default buildSdrGraph;