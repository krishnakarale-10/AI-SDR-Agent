import prisma from "../../../config/prisma.js";
import runDraftEmailChain from "../../chains/draftEmail.chain.js";

export const draftEmail = async (state) => {
    const { campaign, lead, research, humanDecision, draft } = state;
    // Only a human-requested rewrite feeds feedback into the chain.
    // Any other humanDecision action (APPROVE/REJECT/EDIT) is not this
    // node's concern and is still cleared below to avoid stale reprocessing.
    const isRewrite = humanDecision?.action === "REQUEST_REWRITE";
    const rewriteFeedback = isRewrite ? humanDecision.feedback : undefined;

    // Track attempt number: fresh draft starts at step 1, a rewrite
    // increments the previous draft's step.
    const step = isRewrite && draft?.step ? draft.step + 1 : 1;

    try {
        const result = await runDraftEmailChain({ campaign, lead, research, rewriteFeedback });
        const emailRecord = await prisma.email.create({
            data: {
                lead_id: lead.id,
                step,
                subject: result.subject,
                body: result.body,
                personalization: result.personalization,
                ai_model: result.ai_model,
                prompt_version: result.prompt_version,
            },
        });
        return {
            draft: {
                id: emailRecord.id,
                step: emailRecord.step,
                subject: emailRecord.subject,
                body: emailRecord.body,
                personalization: emailRecord.personalization,
                ai_model: emailRecord.ai_model,
                prompt_version: emailRecord.prompt_version,
            },
            emailId: emailRecord.id,
            humanDecision: null,
        };

    } catch (err) {
        return {
            draft: null,
            humanDecision: null,
            errors: [
                {
                    node: "draftEmail",
                    message: err.message,
                    at: new Date().toISOString(),
                },
            ],
        };

    }
};
export default draftEmail;