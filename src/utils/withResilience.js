/**
 * withResilience
 * ------------------------------------------------------------------
 * Wraps any async external call (Tavily, Jina, Cohere, etc.) with:
 *   1. A hard timeout — so one slow API never stalls the whole graph.
 *   2. Retries with backoff — for transient failures (network blips,
 *      momentary rate limits) that succeed on a second attempt.
 *   3. A required fallback — so a call that still fails after retries
 *      degrades gracefully instead of throwing and crashing the node.
 *
 * This is the ONE place timeout/retry/fallback logic lives. Every
 * external call in the research pipeline (and future pipelines)
 * should be wrapped with this instead of hand-rolling try/catch.
 *
 * Usage:
 *   const result = await withResilience(
 *     () => someApiClient.call(args),
 *     {
 *       label: "tavily-search",
 *       timeoutMs: 8000,
 *       retries: 1,
 *       fallback: (err) => ({ results: [] }),
 *     }
 *   );
 */

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {() => Promise<any>} fn - the external call to run
 * @param {object} options
 * @param {string} options.label - name used in error messages/logs
 * @param {number} [options.timeoutMs=8000] - hard timeout per attempt
 * @param {number} [options.retries=1] - number of retries AFTER the first attempt
 * @param {number} [options.backoffMs=500] - base delay between retries (doubles each retry)
 * @param {(err: Error) => any} options.fallback - REQUIRED. Called if every attempt fails.
 *        Must return a value, never throw — this is the safety net.
 * @param {(err: Error, attempt: number) => void} [options.onError] - optional logging hook
 */
export async function withResilience(
  fn,
  { label, timeoutMs = 8000, retries = 1, backoffMs = 500, fallback, onError }
) {
  if (typeof fallback !== "function") {
    throw new Error(`withResilience("${label}"): a fallback function is required`);
  }

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs, label);
    } catch (err) {
      lastError = err;
      onError?.(err, attempt);

      const isLastAttempt = attempt === retries;
      if (!isLastAttempt) {
        await sleep(backoffMs * Math.pow(2, attempt)); // 500ms, 1000ms, 2000ms...
      }
    }
  }

  // Every attempt failed — degrade gracefully instead of throwing.
  return fallback(lastError);
}

export default withResilience;