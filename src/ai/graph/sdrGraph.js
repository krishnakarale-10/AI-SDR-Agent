import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import loadContext from "./nodes/loadContext.node.js";
import researchLead from "./nodes/researchLead.node.js";
import SDRGraphState  from "./state.js";

const buildSdrGraph =({checkPointer}={})=>{
  const graph = new StateGraph(SDRGraphState)
  .addNode('loadContext',loadContext)
  .addNode("researchLead",researchLead)
  .addEdge(START, 'loadContext')
  .addEdge('loadContext', 'researchLead')
  .addEdge('researchLead', END);
  
  return graph.compile({ checkPointer: checkPointer ? checkPointer : new MemorySaver() });
};

export { buildSdrGraph };
export default buildSdrGraph;