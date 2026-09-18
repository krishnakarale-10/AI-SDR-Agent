import "dotenv/config";
import { draftEmailPrompt, draftEmailSchema } from "../prompts/draftEmail.prompt.js";
import { withResilience } from "../../utils/withResilience.js";
import { ChatOpenRouter } from "@langchain/openrouter";

const DRAFT_MODEL_CHEAP = process.env.DRAFT_EMAIL_MODEL_CHEAP || "nvidia/nemotron-3-ultra-550b-a55b:free";
const DRAFT_MODEL_STRONG = process.env.DRAFT_EMAIL_MODEL_STRONG || "deepseek/deepseek-v4-flash-0731:free";
const DRAFT_EMAIL_TEMPERATURE = Number(process.env.DRAFT_EMAIL_TEMPERATURE) || 0.6;
const PROMPT_VERSION = "draftEmail-v1";

/**
 * selectDraftModel
 * ------------------------------------------------------------------
 * Picks which OpenRouter model to use for a given draft attempt, based on
 * research confidence and whether this is a human-requested rewrite.
 *
 * Rules:
 *   - LOW confidence research → draft will be generic/templated regardless
 *     of model strength, so the cheap model (Nvidia) is sufficient.
 *   - HIGH confidence research → richer personalization is possible, and
 *     weaving multiple facts in naturally benefits from a stronger model (DeepSeek).
 *   - A human-requested rewrite means the first attempt was judged
 *     unsatisfactory — getting attempt #2 right matters more, so we
 *     upgrade to the strong model regardless of confidence.
 *
 * @param {object} params
 * @param {"HIGH"|"MEDIUM"|"LOW"} params.confidence - research.confidence
 * @param {boolean} [params.isRewrite=false] - true if humanDecision.action === "REQUEST_REWRITE"
 * @returns {string} the OpenRouter model name to use
 */
const selectDraftModel = ({ confidence, isRewrite = false }) => {
    if (isRewrite) return DRAFT_MODEL_STRONG;
    if (confidence === "HIGH") return DRAFT_MODEL_STRONG;
    return DRAFT_MODEL_CHEAP;
};

const buildDraftModel = (modelName) => {
    return new ChatOpenRouter({
        apiKey: process.env.DRAFT_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY,
        model: modelName,
        temperature: DRAFT_EMAIL_TEMPERATURE,
    }).withStructuredOutput(draftEmailSchema);
};

const validatePersonalization = (draft) => {
    const { body = "", personalization = [] } = draft || {};

    const validEntries = (personalization || []).filter((entry) => {
        const isValid = typeof entry?.phrase === "string" && Boolean(body && body.includes(entry.phrase));
        if (!isValid) {
            console.error(
                `[draftEmail.chain] Dropping personalization entry — phrase not found verbatim in body: "${entry?.phrase}"`
            );
        }
        return isValid;
    });

    return { ...draft, personalization: validEntries };
};

const formatRewriteFeedback = (rewriteFeedback) => {
    if (!rewriteFeedback) {
        return "N/A — this is the first draft attempt for this lead.";
    }
    return `A human reviewer rejected the previous draft and gave this feedback — address it directly and prioritize it over your own instincts:\n"${rewriteFeedback}"`;
};

const runDraftEmailChain = async ({ campaign, lead, research, rewriteFeedback }) => {
    const isRewrite = Boolean(rewriteFeedback);
    const modelName = selectDraftModel({ confidence: research?.confidence, isRewrite });
    const promptInputs = {
        product_description: campaign.product_description,
        value_props: JSON.stringify(campaign.value_props),
        tone: campaign.tone,
        lead_name: lead.full_name,
        lead_job_title: lead.job_title ?? "Unknown",
        lead_company: lead.company ?? "Unknown",
        research_summary: research?.summary ?? "No research summary available.",
        personalization_hooks: JSON.stringify(research?.personalization_hooks ?? []),
        rewrite_feedback: formatRewriteFeedback(rewriteFeedback),
    };

    const result = await withResilience(
        async () => {
            const structuredModel = buildDraftModel(modelName);
            const chain = draftEmailPrompt.pipe(structuredModel);
            return chain.invoke(promptInputs);
        },
        {
            label: `draft-email-chain:${lead.id ?? lead.full_name}`,
            timeoutMs: Number(process.env.DRAFT_EMAIL_TIMEOUT_MS) || 90000,
            retries: 1,
            backoffMs: 500,
            fallback: (err) => ({
                subject: null,
                body: null,
                personalization: [],
                _failed: true,
                _message: err.message,
            }),
            onError: (err, attempt) =>
                console.error(`[draftEmail.chain] attempt ${attempt} failed:`, err.message),
        }
    );

    if (result._failed) {
        throw new Error(`draftEmail chain failed after retries: ${result._message}`);
    }

    const validated = validatePersonalization(result);

    return {
        ...validated,
        ai_model: modelName,
        prompt_version: PROMPT_VERSION,
    };
};

export { runDraftEmailChain };
export default runDraftEmailChain;

