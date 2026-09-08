import { CohereClient } from "cohere-ai";
import withResilience from "../../utils/withResilience.js";

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
const MODEL = process.env.COHERE_RERANK_MODEL || "rerank-v3.5";
const TOP_N = Number(process.env.RERANK_TOP_N) || 5;

const rerankChunks = async(Query,chunks)=>{
    return withResilience(
        async()=>{
            const response= await cohere.rerank({
                model:MODEL,
                query:Query,
                documents:chunks,
                topN:TOP_N
            });
            return response.results.map((result) => chunks[result.index]);
        },
        {
        label: "cohere-rerank",
        timeoutMs: 6000,
        retries: 1,
        backoffMs: 500,
        fallback: () => chunks.slice(0, TOP_N),
        onError: (err, attempt) =>
        console.error(`[reranker] attempt ${attempt} failed:`, err.message),
        }
    )   
}

export default rerankChunks;