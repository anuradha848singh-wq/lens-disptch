import { connection as redis } from "../queue";
import { DelayedError } from "bullmq";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_RPM = 30;

export async function summarizeClusterWithGroq(articles: Array<any>): Promise<any | null> {
  if (!GROQ_API_KEY) {
    console.warn("[Summarizer] GROQ_API_KEY is not configured.");
    return null;
  }

  if (redis) {
    try {
      const key = 'groq:rpm:' + Math.floor(Date.now() / 60000);
      const count = await redis.incr(key);
      await redis.expire(key, 65);

      if (count > GROQ_RPM) {
        console.warn(`[Summarizer] Groq RPM limit (${GROQ_RPM}) exceeded. Delaying job by 10s.`);
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

  const prompt = `You are an elite, neutral senior news intelligence analyst. Synthesize the following news reports reporting on the same event.
Provide a highly thorough, detailed, and deep-thinking analysis.

Generate:
1. summary: A thorough, detailed, and highly informative neutral summary of 3-4 sentences explaining the core event, background context, and current state.
2. bullets: Exactly 3 high-quality, comprehensive bullet points detailing key insights, facts, or distinct narrative perspectives.
3. framingDiff: In 1-2 sentences, explain specifically how left-leaning and right-leaning sources differ in their framing (what they emphasize, omit, or downplay). If no political divide is present, return null.
4. foreignGaze: Compare domestic vs foreign/international reporting. Provide a domesticSummary, a foreignSummary, a difference (explaining differing narrative focus), and lists of domesticSources and foreignSources. If both domestic and foreign coverage are not present, return null.
5. marketTickers: Extract any publicly traded companies. Return an array of tickers (e.g. AAPL, TSLA), company names, and the publisher source it was extractedFrom (or null).
6. entityQuotes: Extract 1 to 3 direct quotes from named public figures. Return the entity (person), the exact quote, a short topic (1-2 words), and the source publisher. If none, return an empty array.
7. executiveBriefing: A comprehensive editorial briefing. Provide a 3-sentence summary, a list of 3-5 key_players (with brief titles/affiliations), a chronological timeline of 3 key events/dates in this story, and any discrepancies (conflicting reports or claims) across sources.

Articles to summarize:
${articlesText}

Provide your response in JSON format matching this EXACT schema:
{
  "summary": "thorough and detailed paragraph summary here",
  "bullets": ["comprehensive bullet point 1", "comprehensive bullet point 2", "comprehensive bullet point 3"],
  "framingDiff": "explanation or null",
  "foreignGaze": {
    "domesticSummary": "...",
    "foreignSummary": "...",
    "difference": "...",
    "domesticSources": ["source1"],
    "foreignSources": ["source2"]
  } | null,
  "marketTickers": {
    "tickers": ["AAPL"],
    "companies": ["Apple Inc."],
    "extractedFrom": "source name"
  } | null,
  "entityQuotes": [
    {
      "entity": "Person Name",
      "quote": "exact quote",
      "topic": "topic",
      "source": "source name"
    }
  ],
  "executiveBriefing": {
    "summary": "3-sentence detailed synthesis here",
    "key_players": ["Name (Title/Affiliation)", "Name (Title/Affiliation)"],
    "timeline": ["Date/Event: details here", "Date/Event: details here", "Date/Event: details here"],
    "discrepancies": ["Discrepancy 1 description", "Discrepancy 2 description"],
    "generated_at": "${new Date().toISOString()}"
  }
}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // State-of-the-art 70B model supporting JSON mode
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a professional news analyst providing structured JSON summaries." },
          { role: "user", content: prompt }
        ],
        temperature: 0.25
      }),
      signal: AbortSignal.timeout(30000) // 30s timeout for larger model reasoning
    });

    if (!response.ok) {
      console.warn(`[Summarizer] Groq API returned HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const contentText = data?.choices?.[0]?.message?.content;
    if (contentText) {
      const parsed = JSON.parse(contentText);
      const result = {
        summary: parsed.summary || "",
        aiSummary: parsed.bullets || [],
        aiFramingDiff: parsed.framingDiff || null,
        aiForeignGaze: parsed.foreignGaze || null,
        aiMarketTickers: parsed.marketTickers || null,
        aiEntityQuotes: parsed.entityQuotes || [],
        aiExecutiveBriefing: parsed.executiveBriefing || null
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
    }
    return null;
  } catch (err: any) {
    console.error("[Summarizer] Groq API request failed:", err.message);
    return null;
  }
}
