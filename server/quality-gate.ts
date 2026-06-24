// ─────────────────────────────────────────────────────────────────────────────
// PRE-INGESTION QUALITY GATE
// Runs BEFORE articles enter the queue. Rejects garbage at the door
// so only real journalism reaches the clustering + homepage pipeline.
// ─────────────────────────────────────────────────────────────────────────────

// ── CLICKBAIT PATTERNS (title-level) ──
const CLICKBAIT_EXACT = new Set([
  "you won't believe", "you will never believe", "you'll never guess",
  "this one trick", "this simple trick", "doctors hate",
  "shocking truth", "mind blowing", "mind-blowing",
  "gone viral", "going viral", "broke the internet",
  "wait until you see", "watch what happens",
  "what happens next will", "what happened next",
  "must read", "must see", "must watch",
  "incredible discovery", "miracle cure", "secret to",
  "simple trick", "amazing results",
  "everything you need to know", "here's everything",
  "the real reason", "the truth about",
  "this changes everything", "game changer",
  "can't stop laughing", "had us in tears",
  "destroyed", "obliterated", "slammed", "ripped apart",
  // Social media / entertainment noise
  "claps back", "fires back", "fans are going crazy",
  "internet is divided", "internet reacts",
  "spotted wearing", "flaunts",
  "you need to try", "life hack",
]);

// Patterns that match via regex (more flexible)
const CLICKBAIT_REGEX = [
  /\b(you won'?t|won'?t) believe\b/i,
  /\?{3,}/,                               // ??? or more
  /!{3,}/,                                // !!! or more
  /^\d+ (things|reasons|ways|signs|secrets|facts|tips|hacks)\b/i,  // "10 things..." listicles
  /^(watch|see|look):/i,                  // "Watch: ..." video bait
  /\b(EXPOSED|DESTROYED|SLAMMED|OBLITERATED)\b/,  // ALL-CAPS sensationalism
  /\b(heartbreaking|jaw-dropping|eye-opening|gut-wrenching|spine-tingling)\b/i,
  /\b(insane|unreal|crazy|wild|savage|epic)\b.*\b(video|clip|moment|reaction)\b/i,
  /\b(ranked|tier list|hot take)\b/i,     // Opinion / entertainment
];

// ── NON-NEWS CONTENT FILTERS ──
const NON_NEWS_PATTERNS = [
  /\b(horoscope|zodiac|astrology|tarot)\b/i,
  /\b(recipe|cooking tips|meal prep)\b/i,
  /\b(celebrity|gossip|reality tv|bachelor|bachelorette)\b/i,
  /\b(quiz|trivia|puzzle|crossword|wordle)\b/i,
  /\b(sponsored|paid content|branded content|advertis)/i,
  /\b(coupon|discount code|promo code|deal of the day)\b/i,
  /\b(best .+ to buy|top .+ products|gift guide)\b/i,  // Shopping
  /\b(subscribe now|sign up free|limited time)\b/i,    // Marketing
  /\b(slideshow|gallery|photos of the day)\b/i,        // Low-value content
];

// ── SUBSTANCE REQUIREMENTS ──
const MIN_TITLE_LENGTH = 25;         // "X does Y" — too vague below 25 chars
const MIN_DESCRIPTION_LENGTH = 40;   // Must have real summary
const MAX_TITLE_LENGTH = 300;        // Reject titles that are full paragraphs (feed parsing error)
const MAX_AGE_HOURS_INITIAL = 48;    // First few cycles: only last 48h (was 24)
const MAX_AGE_HOURS_STEADY = 36;     // Steady state: last 36h (was 24)



export interface QualityVerdictResult {
  pass: boolean;
  reason?: string;
  score: number;         // 0-100 quality estimate
  flags: string[];       // All reasons for score reduction
}

/**
 * Pre-ingestion quality gate. Returns pass/fail + reason.
 * This runs BEFORE the article enters the BullMQ queue, so it's
 * the cheapest possible place to reject garbage.
 */
export function preIngestQualityGate(
  title: string,
  description: string,
  url: string,
  publishedAt: string | undefined,
  sourceQuality: number,
  isInitialCycle: boolean = false
): QualityVerdictResult {
  const flags: string[] = [];
  let score = 100;

  // ── 1. TITLE CHECKS ──
  if (!title || title.trim().length < MIN_TITLE_LENGTH) {
    return { pass: false, reason: "title_too_short", score: 0, flags: ["title too short"] };
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return { pass: false, reason: "title_too_long", score: 0, flags: ["title is a paragraph, not a headline"] };
  }
  if (title === "[Removed]" || title.toLowerCase().startsWith("untitled")) {
    return { pass: false, reason: "title_removed", score: 0, flags: ["removed/placeholder title"] };
  }

  const titleLower = title.toLowerCase();

  // Clickbait exact match
  for (const pattern of CLICKBAIT_EXACT) {
    if (titleLower.includes(pattern)) {
      score -= 40;
      flags.push(`clickbait: "${pattern}"`);
      break; // One clickbait flag is enough
    }
  }

  // Clickbait regex match
  for (const regex of CLICKBAIT_REGEX) {
    if (regex.test(title)) {
      score -= 35;
      flags.push(`clickbait pattern: ${regex.source.substring(0, 30)}`);
      break;
    }
  }

  // Non-news content
  for (const regex of NON_NEWS_PATTERNS) {
    if (regex.test(title) || regex.test(description || "")) {
      score -= 50;
      flags.push(`non-news content: ${regex.source.substring(0, 30)}`);
      break;
    }
  }

  // ALL-CAPS title (more than 50% uppercase words = sensationalist)
  const words = title.split(/\s+/);
  const capsWords = words.filter(w => /^[A-Z]{4,}$/.test(w));
  if (words.length > 3 && capsWords.length / words.length > 0.4) {
    score -= 20;
    flags.push("excessive caps (sensationalist)");
  }

  // Emoji-heavy titles (> 2 emoji = social media noise)
  const emojiCount = (title.match(/[\u{1F600}-\u{1F9FF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]/gu) || []).length;
  if (emojiCount > 2) {
    score -= 15;
    flags.push("emoji-heavy title");
  }

  // ── 2. DESCRIPTION / SUBSTANCE CHECKS ──
  const desc = (description || "").trim();
  if (desc.length < MIN_DESCRIPTION_LENGTH) {
    score -= 15;
    flags.push("description too short/missing");
  }

  // Reject if description is just the title repeated
  if (desc && titleLower === desc.toLowerCase().substring(0, titleLower.length)) {
    score -= 10;
    flags.push("description is just the title");
  }

  // ── 3. FRESHNESS ──
  if (publishedAt) {
    const pubDate = new Date(publishedAt);
    if (!isNaN(pubDate.getTime())) {
      const hoursOld = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);
      const maxAge = isInitialCycle ? MAX_AGE_HOURS_INITIAL : MAX_AGE_HOURS_STEADY;
      
      if (hoursOld > maxAge) {
        return { pass: false, reason: "too_old", score: 0, flags: [`article ${Math.round(hoursOld)}h old, max ${maxAge}h`] };
      }
      // Mild freshness bonus for very recent articles
      if (hoursOld < 6) {
        score += 5;
        flags.push("fresh (<6h)");
      }
    }
  }

  // ── 4. URL QUALITY ──
  try {
    const urlObj = new URL(url);
    // Reject tracking/redirect URLs
    if (urlObj.hostname.includes("bit.ly") || urlObj.hostname.includes("t.co") || 
        urlObj.hostname.includes("goo.gl") || urlObj.hostname.includes("tinyurl")) {
      score -= 10;
      flags.push("shortened/tracking URL");
    }
    // Reject non-article URLs (video pages, podcast pages, etc.)
    const path = urlObj.pathname.toLowerCase();
    if (path.includes("/video/") || path.includes("/podcast/") || path.includes("/gallery/") ||
        path.includes("/slideshow/") || path.includes("/live-blog/")) {
      score -= 20;
      flags.push("non-article URL (video/podcast/gallery)");
    }
  } catch { /* Invalid URL — let it through for now */ }

  // ── 5. SOURCE QUALITY MULTIPLIER ──
  if (sourceQuality < 50) {
    score -= 15;
    flags.push("low quality source");
  } else if (sourceQuality >= 90) {
    score += 5;
    flags.push("premium source");
  }

  // ── FINAL VERDICT ──
  const finalScore = Math.max(0, Math.min(100, score));
  const threshold = sourceQuality >= 85 ? 35 : 45; // Premium sources get lower bar (they earned trust)

  return {
    pass: finalScore >= threshold,
    reason: finalScore < threshold ? "quality_too_low" : undefined,
    score: finalScore,
    flags,
  };
}

/**
 * Log-friendly one-liner for rejected articles (helps debugging pipeline issues)
 */
export function formatRejection(title: string, source: string, verdict: QualityVerdictResult): string {
  return `[QualityGate] REJECTED "${title.substring(0, 50)}..." from ${source} — score=${verdict.score}, reason=${verdict.reason}, flags=[${verdict.flags.join(", ")}]`;
}
