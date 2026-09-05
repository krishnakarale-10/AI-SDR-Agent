import withResilience from "../../utils/withResilience.js";
import 'dotenv/config';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";


const JINA_READER_BASE = "https://r.jina.ai/";
const CHUNK_SIZE = 400; // characters per chunk
const CHUNK_OVERLAP = 50; // slight overlap so facts split across a boundary aren't lost
const MAX_CHUNKS_PER_URL = 8; // safety cap — a long page shouldn't produce unbounded chunks

const fetchCleanContent = (url) => {
    return withResilience(
        async () => {
            const headers = {};
            if (process.env.JINA_API_KEY) {
                headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
            }

            const response = await fetch(`${JINA_READER_BASE}${url}`, { headers });

            if (!response.ok) {
                throw new Error(`Jina Reader returned ${response.status} for ${url}`);
            }
            return response.text();
        },
        {
            label: `jina-fetch:${url}`,
            timeoutMs: 8000,
            retries: 1,
            backoffMs: 500,
            fallback: () => null, // caller skips this URL if content couldn't be fetched
            onError: (err, attempt) =>
            console.error(`[fetchAndChunk] attempt ${attempt} failed for ${url}:`, err.message),
        }
    );

}

const chunkText= async(text)=>{
    if (!text) return [];
    const splitter =  new RecursiveCharacterTextSplitter({
        chunkSize:CHUNK_SIZE,
        chunkOverlap:CHUNK_OVERLAP
    });

    const chunk = await splitter.splitText(text);
    return chunk.slice(0, MAX_CHUNKS_PER_URL)

}

const fetchAndChunk =async (url)=>{
    if(!url){
        return [];
    }
    const content = await fetchCleanContent(url);
    if (!content) {
        return [];
    }
    return await chunkText(content);
};

export default fetchAndChunk;
