import { Annotation } from "@langchain/langgraph";

const overWriteReducer = (current, update) => update;

const appendReducer = (current, update) => {
    const incomming = Array.isArray(update) ? update : [update];
    return [...current, ...incomming];  
};

 const SDRGraphState=  Annotation.Root({
    userId: Annotation({ reducer: overWriteReducer, default: () => null }),
    campaignId: Annotation({ reducer: overWriteReducer, default: () => null }),
    leadId: Annotation({ reducer: overWriteReducer, default: () => null }),
    emailId: Annotation({ reducer: overWriteReducer, default: () => null }),
    aiJobId: Annotation({ reducer: overWriteReducer, default: () => null }),
    campaign: Annotation({ reducer: overWriteReducer, default: () => null }),
    lead: Annotation({ reducer: overWriteReducer, default: () => null }),
    research: Annotation({ reducer: overWriteReducer, default: () => null }),
    draft: Annotation({ reducer: overWriteReducer, default: () => null }),
    spamCheck: Annotation({ reducer: overWriteReducer, default: () => null }),
    humanDecision: Annotation({ reducer: overWriteReducer, default: () => null }),
    approvalStatus: Annotation({ reducer: overWriteReducer, default: () => "PENDING" }),
    sendResult: Annotation({ reducer: overWriteReducer, default: () => null }),
    followUp: Annotation({ reducer: overWriteReducer, default: () => null }),
    incomingReply: Annotation({ reducer: overWriteReducer, default: () => null }),
    replyClassification: Annotation({ reducer: overWriteReducer, default: () => null }),
    finalVerdict: Annotation({ reducer: overWriteReducer, default: () => null }),
    emailContent: Annotation({ reducer: overWriteReducer, default: () => null }),
    retryCount: Annotation({ reducer: overWriteReducer, default: () => 0 }),
    errors: Annotation({ reducer: appendReducer, default: () => [] }),
    status: Annotation({ reducer: overWriteReducer, default: () => "PENDING" }),    
});

export default SDRGraphState;