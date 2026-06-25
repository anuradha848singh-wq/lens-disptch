import { VERIFIED_RSS_SOURCES, RSSSource } from "./lib/verified-publishers";

// Curated RSS feeds bucketed by 5-tier bias with quality scores
// Quality Scale: 90+ = Wire/Record-of-record | 80-89 = Quality journalism | 70-79 = Usable | <70 = Tabloid (excluded)
// Sources below quality 60 are REMOVED — they pollute clusters with clickbait

export type { RSSSource };

// We export the dynamically generated and verified list of 70+ massive global publishers.
export const RSS_SOURCES: Record<string, RSSSource[]> = VERIFIED_RSS_SOURCES;

// Quality gates per tier — minimum score to enter processing queue
export const QUALITY_GATES: Record<string, number> = {
  "AGGREGATORS": 50,           // Wire services always pass
  "pro_opposition_2": 60,      // Left-leaning quality filter
  "neutral": 50,               // Center quality filter (most lenient to ensure high volume)
  "pro_establishment": 50,     // Right-leaning quality filter
  "pro_establishment_2": 40,   // Far-right allowed lower quality to maintain blindspot density
};
