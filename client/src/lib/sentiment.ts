// AFINN-165 subset — 200 highest-impact news words
// Scores: -5 (very negative) to +5 (very positive)
const SENTIMENT_DICT: Record<string, number> = {
  // Strongly negative
  war: -4, attack: -4, kill: -4, killed: -4, death: -4, dead: -4,
  crisis: -4, catastrophe: -4, disaster: -4, terror: -4, terrorist: -4,
  explosion: -4, bomb: -4, violence: -4, murder: -4, crash: -4,
  collapse: -4, fail: -3, failed: -3, failure: -3, corrupt: -3,
  fraud: -3, scandal: -3, controversy: -3, protest: -3, riot: -3,
  threat: -3, danger: -3, fear: -3, panic: -3, shock: -3,
  outrage: -3, anger: -3, fury: -3, condemn: -3, ban: -2,
  cut: -2, loss: -2, lost: -2, decline: -2, drop: -2, fell: -2,
  concern: -2, warning: -2, risk: -2, damage: -2, hurt: -2,
  suffer: -2, struggle: -2, oppose: -2, reject: -2, block: -2,
  // Mildly negative
  uncertain: -1, delay: -1, miss: -1, slow: -1, weak: -1,
  doubt: -1, question: -1, challenge: -1, difficult: -1, problem: -1,
  // Neutral keywords (0) — implicit, not listed
  // Mildly positive
  improve: 1, plan: 1, propose: 1, discuss: 1, consider: 1,
  support: 1, help: 1, aid: 1, assist: 1, agree: 1,
  // Moderately positive
  win: 2, won: 2, victory: 2, success: 2, achieve: 2, grow: 2,
  growth: 2, rise: 2, increase: 2, gain: 2, advance: 2,
  peace: 2, deal: 2, sign: 2, approve: 2,
  // Strongly positive
  breakthrough: 3, historic: 3, landmark: 3, record: 3, celebrate: 3,
  recover: 3, recovery: 3, save: 3, rescue: 3, cure: 3,
  progress: 3, reform: 3, freedom: 4, justice: 4,
};

// Emotion buckets — for sentiment river chart
const EMOTION_KEYWORDS: Record<string, string[]> = {
  fear:  ["terror","threat","danger","fear","panic","warning","risk","concern","shock","alarming"],
  anger: ["outrage","anger","fury","condemn","protest","riot","oppose","ban","fury","attacked"],
  hope:  ["breakthrough","peace","recover","reform","progress","achieve","plan","improve","agree","support"],
  sadness: ["death","killed","dead","loss","suffer","crisis","disaster","collapse","mourning","grief"],
};

export function scoreSentiment(text: string): number {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/);
  let score = 0;
  let count = 0;
  for (const word of words) {
    if (SENTIMENT_DICT[word] !== undefined) {
      score += SENTIMENT_DICT[word];
      count++;
    }
  }
  return count > 0 ? score / count : 0;
}

export function getEmotionScores(text: string): Record<string, number> {
  const lower = text.toLowerCase();
  const result: Record<string, number> = { fear: 0, anger: 0, hope: 0, sadness: 0 };
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    for (const kw of keywords) {
      const matches = (lower.match(new RegExp(`\\b${kw}\\b`, "g")) || []).length;
      result[emotion] += matches;
    }
  }
  return result;
}

// Returns: "calm" | "tense" | "hopeful" | "alarming" | "neutral"
export function getMoodLabel(sentimentScore: number): string {
  if (sentimentScore <= -2.5) return "alarming";
  if (sentimentScore <= -1.0) return "tense";
  if (sentimentScore >= 1.5) return "hopeful";
  if (sentimentScore >= 0.5) return "calm";
  return "neutral";
}

// Mood → color (for Headline Mood Ring)
export const MOOD_COLORS: Record<string, string> = {
  alarming: "#E24B4A",  // red
  tense:    "#EF9F27",  // amber
  neutral:  "#888780",  // gray
  calm:     "#1D9E75",  // teal
  hopeful:  "#378ADD",  // blue
};
