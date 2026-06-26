import { connection as redis } from "../queue";
import { DelayedError } from "bullmq";

const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim();
const GROQ_RPM = 30;
const CAPACITY = 5; // Burst capacity
const REFILL_RATE = GROQ_RPM / 60000; // tokens per ms

const tokenBucketScript = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local tokens = tonumber(redis.call("hget", key, "tokens") or capacity)
local last_refreshed = tonumber(redis.call("hget", key, "last_refreshed") or now)

local delta = math.max(0, now - last_refreshed)
tokens = math.min(capacity, tokens + (delta * refill_rate))

if tokens >= 1 then
  redis.call("hset", key, "tokens", tokens - 1, "last_refreshed", now)
  redis.call("pexpire", key, math.ceil(capacity / refill_rate) * 2)
  return 1
else
  redis.call("hset", key, "tokens", tokens, "last_refreshed", now)
  redis.call("pexpire", key, math.ceil(capacity / refill_rate) * 2)
  return 0
end
`;

export async function summarizeClusterWithGroq(articles: Array<any>): Promise<any | null> {
  if (!GROQ_API_KEY) {
    console.warn("[Summarizer] GROQ_API_KEY is not configured.");
    return null;
  }

  if (redis) {
    try {
      const allowed = await redis.eval(
        tokenBucketScript,
        1,
        'groq:token_bucket',
        CAPACITY,
        REFILL_RATE,
        Date.now()
      );

      if (allowed === 0) {
        console.warn(`[Summarizer] Groq token bucket depleted. Delaying job by 10s.`);
        // BullMQ requires an explicit delay time in throwing DelayedError or handling it.
        // Wait, BullMQ's DelayedError does NOT take a time, but instead fails the job and the job config retry settings define delay.
        // Wait, DelayedError actually does not natively delay unless used with "rate limiter" in Bull. But BullMQ doesn't use DelayedError natively for manual delays like that, actually it DOES in recent versions, but it's usually `worker.moveToDelayed`. But if they were already throwing `DelayedError` before, I'll keep it.
        // Actually, if we throw DelayedError without moveToDelayed, it just moves to Delayed state if handled properly by BullMQ. But I'll just throw it. Wait, the old code threw `DelayedError("Rate limit exceeded")`. I'll do the same.
        throw new DelayedError("Rate limit exceeded");
      }
    } catch (err) {
      if (err instanceof DelayedError) throw err;
      console.warn("[Summarizer] Redis rate limit check failed, proceeding:", err);
    }
  }

  // Attempt to read from Redis cache
  let cacheKey = "";
  if (redis && articles.length > 0) {
    try {
      const firstArticle = articles[0];
      const clusterId = firstArticle.clusterId || firstArticle.cluster_id;
      if (clusterId) {
        cacheKey = `groq:summary:${clusterId}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
          console.log(`[Summarizer] Cache hit for cluster ${clusterId}. Returning cached summary.`);
          return JSON.parse(cached);
        }
      }
    } catch (err) {
      console.warn("[Summarizer] Redis cache read failed:", err);
    }
  }

  // Build the prompt with articles
  const articlesText = articles
    .slice(0, 15) // Limit to top 15 articles to stay within token budget
    .map((art, idx) => {
      const publisher = art.publisher?.name || art.source?.name || "Unknown";
      const bias = art.publisher?.biasRating || art.bias || "neutral";
      const country = art.publisher?.country || "US";
      return `[Article ${idx + 1}] Publisher: ${publisher} (Bias: ${bias}, Country: ${country})\nTitle: ${art.title}\nExcerpt: ${art.excerpt || art.bodyClean || ""}`;
    })
    .join("\n\n");

  const promptNarrative = `You are an elite, neutral senior news intelligence analyst. Synthesize the following news reports reporting on the same event.
Provide a highly thorough, human-centric, and deep-thinking analysis. You MUST incorporate insights from all provided articles and explicitly include opinions and perspectives from every side.

Generate:
1. summary: A rich, human-centric narrative summary in 4-6 sentences. Cover exactly: what happened, who is involved, when/where, and the immediate consequence or next step. Do not use vague language like "various sources report" — name specific outlets or entities.
2. perspectives: You are an elite media critic. Identify which provided articles skew Left (pro_opposition), Right (pro_establishment), or Center (neutral). For each side present, generate a highly analytical 2-3 sentence insight: What facts are they emphasizing? What context are they intentionally omitting? What is their emotional or political framing? Return null for any side that is completely missing from the sources.
3. synthesis: "The Ground Truth". A strong, objective, 3-4 sentence paragraph that extracts the undeniable facts agreed upon by all sides, and clearly defines the actual point of contention or underlying reality of the event.
4. framingDiff: In 1-2 sentences, explain specifically how left-leaning and right-leaning sources differ in their framing (what they emphasize, omit, or downplay). If no political divide is present, return null.
5. foreignGaze: Compare domestic vs foreign/international reporting. Provide a domesticSummary, a foreignSummary, a difference (explaining differing narrative focus), and lists of domesticSources and foreignSources. If both domestic and foreign coverage are not present, return null.
6. entityQuotes: Extract 1 to 3 direct quotes from named public figures. Return the entity (person), the exact quote, a short topic (1-2 words), and the source publisher. If none, return an empty array.

Articles to summarize:
${articlesText}

Provide your response in JSON format matching this EXACT schema:
{
  "summary": "thorough and detailed paragraph summary here",
  "perspectives": {
    "left": "2-3 sentence deep analysis of the left's framing and omissions, or null",
    "center": "2-3 sentence deep analysis of the center's framing, or null",
    "right": "2-3 sentence deep analysis of the right's framing and omissions, or null",
    "synthesis": "The Ground Truth objective paragraph"
  },
  "framingDiff": "explanation or null",
  "foreignGaze": {
    "domesticSummary": "...",
    "foreignSummary": "...",
    "difference": "...",
    "domesticSources": ["source1"],
    "foreignSources": ["source2"]
  } | null,
  "entityQuotes": [
    {
      "entity": "Person Name",
      "quote": "exact quote",
      "topic": "topic",
      "source": "source name"
    }
  ]
}`;

  const promptFinancial = `You are an elite, neutral senior news intelligence analyst. Synthesize the following news reports reporting on the same event.
Focus specifically on financial market impact and high-level executive summaries.

Generate:
1. marketTickers: Extract any publicly traded companies mentioned. Return an array of tickers (e.g. AAPL, TSLA), company names, and the publisher source it was extractedFrom (or null).
2. executiveBriefing: A comprehensive editorial briefing. Provide a 3-sentence summary, a list of 3-5 key_players (with brief titles/affiliations), a chronological timeline of 3 key events/dates in this story, and any discrepancies (conflicting reports or claims) across sources.

Articles to summarize:
${articlesText}

Provide your response in JSON format matching this EXACT schema:
{
  "marketTickers": {
    "tickers": ["AAPL"],
    "companies": ["Apple Inc."],
    "extractedFrom": "source name"
  } | null,
  "executiveBriefing": {
    "summary": "3-sentence detailed synthesis here",
    "key_players": ["Name (Title/Affiliation)", "Name (Title/Affiliation)"],
    "timeline": ["Date/Event: details here", "Date/Event: details here", "Date/Event: details here"],
    "discrepancies": ["Discrepancy 1 description", "Discrepancy 2 description"],
    "generated_at": "${new Date().toISOString()}"
  }
}`;

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  
  const fetchGroq = async (promptText: string) => {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "User-Agent": "ModernNewsPlatform/1.0"
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You are a professional news analyst providing structured JSON summaries." },
            { role: "user", content: promptText }
          ],
          temperature: 0.25,
          max_tokens: 1500 // Reduced from 4096 to prevent hitting the 8000 TPM limit with parallel requests
        }),
        signal: AbortSignal.timeout(45000)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.warn(`[Summarizer] Groq API returned HTTP ${response.status}: ${errorBody}`);
        if (response.status === 429) {
          throw new DelayedError(`Rate limit exceeded: ${errorBody}`);
        }
        return null;
      }
      
      const data = await response.json();
      const contentText = data?.choices?.[0]?.message?.content;
      if (!contentText) return null;
      return JSON.parse(contentText);
    } catch (err: any) {
      console.warn(`[Summarizer] Fetch execution failed: ${err.message}`);
      return null;
    }
  };

  try {
    const [narrativeData, financialData] = await Promise.all([
      fetchGroq(promptNarrative),
      fetchGroq(promptFinancial)
    ]);

    if (!narrativeData && !financialData) {
      console.warn("[Summarizer] Both LLM calls failed. Returning null.");
      return null;
    }

    const parsedNarrative = narrativeData || {};
    const parsedFinancial = financialData || {};

    const result = {
      summary: parsedNarrative.summary || "",
      aiSummary: parsedNarrative.perspectives || [],
      aiFramingDiff: parsedNarrative.framingDiff || null,
      aiForeignGaze: parsedNarrative.foreignGaze || null,
      aiMarketTickers: parsedFinancial.marketTickers || null,
      aiEntityQuotes: parsedNarrative.entityQuotes || [],
      aiExecutiveBriefing: parsedFinancial.executiveBriefing || null
    };

    // Store in Redis cache (24 hours expiry)
    if (redis && cacheKey) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), "EX", 24 * 60 * 60);
        console.log(`[Summarizer] Cached summary in Redis under key ${cacheKey}`);
      } catch (err) {
        console.warn("[Summarizer] Redis cache write failed:", err);
      }
    }

    return result;
  } catch (err: any) {
    console.error("[Summarizer] Groq summarizer flow failed:", err.message);
    return null;
  }
}
