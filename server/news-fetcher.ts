/**
 * Real News Fetcher — pulls live articles from GNews API
 * 
 * GNews API is free (100 requests/day, 10 articles/request).
 * Set NEWS_API_KEY environment variable with your key from https://gnews.io
 * 
 * Falls back to NewsAPI.org if NEWSAPI_KEY is set instead.
 * If neither key is set, it fetches from public RSS feeds as a fallback.
 */

import { storage } from "./storage";
import { type Article } from "@shared/schema";
import * as cheerio from "cheerio";
import Parser from "rss-parser";
import { RSS_SOURCES } from "./rss-sources";
import crypto from "crypto";

const parser = new Parser({
  customFields: {
    item: [["media:content", "media"], ["content:encoded", "contentEncoded"]],
  }
});

// Known publisher bias & factuality database (inspired by Media Bias/Fact Check)
import { EXTENDED_PUBLISHER_BIAS_DB, type PublisherInfo } from "./publisher-bias-db";

const PUBLISHER_BIAS_DB: Record<string, PublisherInfo> = EXTENDED_PUBLISHER_BIAS_DB;

function lookupPublisherInfo(sourceName: string, sourceUrl?: string) {
  const nameLower = sourceName.toLowerCase().trim();
  
  // Try exact match first
  if (PUBLISHER_BIAS_DB[nameLower]) return PUBLISHER_BIAS_DB[nameLower];
  
  // Try domain match
  if (sourceUrl) {
    try {
      const domain = new URL(sourceUrl).hostname.replace("www.", "");
      if (PUBLISHER_BIAS_DB[domain]) return PUBLISHER_BIAS_DB[domain];
    } catch {}
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(PUBLISHER_BIAS_DB)) {
    if (nameLower.includes(key) || key.includes(nameLower)) return value;
  }
  
  // Default: center, mixed
  return { 
    bias: "center" as const, 
    factuality: "mixed" as const,
    ownerName: "Unknown",
    ownerType: "unknown" as const,
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 200);
}

// Guess category from article keywords/title
function guessCategory(title: string, description?: string): string {
  const text = `${title} ${description || ""}`.toLowerCase();
  
  if (/politic|election|congress|senate|white house|parliament|government|democrat|republican|vote|legislat|sanctions|treaty|modi|bjp|lok sabha|rajya sabha/.test(text)) return "politics";
  if (/tech| ai |artificial|software|algorithm|semiconductor|cloud|compute|startup|cyber|robot|app|iphone|android|social media/.test(text)) return "technology";
  if (/business|economy|stock|market|nasdaq|dow jones|gdp|inflation|trade|finance|bank|crypto|bitcoin|investing|earnings|ceo|sensex|nifty|rupee/.test(text)) return "business";
  if (/health|medical|doctor|hospital|science|research|vaccine|drug|disease|mental|covid|cancer|surgery|biology/.test(text)) return "health";
  if (/sport|game|team|player|league|championship|cup|tournament|stadium|medal|football|basketball|soccer|tennis|cricket|ipl/.test(text)) return "sports";
  if (/world|global|international|nation|foreign|conflict|war|peace|summit|un |nato|eu |europe|africa|asia|middle east/.test(text)) return "world";
  if (/movie|film|actor|music|song|album|concert|celebrity|hollywood|bollywood|netflix|streaming|theater|entertainment/.test(text)) return "entertainment";
  return "politics"; // default
}

interface GNewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

interface NewsAPIArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: {
    id: string | null;
    name: string;
  };
  author: string;
}

interface ArticleToProcess {
  title: string;
  description?: string;
  content?: string;
  url: string;
  image?: string;
  publishedAt: string;
  source: {
    name: string;
    url?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════
// GLOBAL RSS FEED LIST — REGION-WISE
// Each feed is tagged with a region code so the fetcher can filter
// based on the user's configured country in Settings.
// ═══════════════════════════════════════════════════════════════════

type RSSFeed = { url: string; name: string; region: string; bias?: "left" | "center" | "right" };

const GLOBAL_RSS_FEEDS: RSSFeed[] = [
  // ── 🇮🇳 INDIA ──
  { url: "https://www.thehindu.com/news/feeder/default.rss", name: "The Hindu", region: "IN", bias: "center" },
  { url: "https://indianexpress.com/feed/", name: "Indian Express", region: "IN", bias: "center" },
  { url: "https://feeds.feedburner.com/ndtvnews-top-stories", name: "NDTV", region: "IN", bias: "left" },
  { url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", name: "Times of India", region: "IN", bias: "center" },
  { url: "https://www.hindustantimes.com/feeds/rss/topnews/rssfeed.xml", name: "Hindustan Times", region: "IN", bias: "center" },
  { url: "https://www.news18.com/rss/india.xml", name: "News18", region: "IN", bias: "right" },
  { url: "https://economictimes.indiatimes.com/rssfeedsdefault.cms", name: "Economic Times", region: "IN", bias: "center" },
  { url: "https://www.business-standard.com/rss/home_page_top_stories.rss", name: "Business Standard", region: "IN", bias: "center" },
  { url: "https://zeenews.india.com/rss/india-national-news.xml", name: "Zee News", region: "IN", bias: "right" },
  { url: "https://scroll.in/feeds/all.rss", name: "Scroll.in", region: "IN", bias: "left" },

  // ── 🇺🇸 USA ──
  { url: "http://rss.cnn.com/rss/edition.rss", name: "CNN", region: "US", bias: "left" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", name: "The New York Times", region: "US", bias: "left" },
  { url: "http://feeds.washingtonpost.com/rss/world", name: "Washington Post", region: "US", bias: "left" },
  { url: "http://feeds.foxnews.com/foxnews/latest", name: "Fox News", region: "US", bias: "right" },
  { url: "https://feeds.nbcnews.com/nbcnews/public/news", name: "NBC News", region: "US", bias: "left" },
  { url: "https://abcnews.go.com/abcnews/topstories", name: "ABC News", region: "US", bias: "left" },
  { url: "https://feeds.npr.org/1001/rss.xml", name: "NPR", region: "US", bias: "left" },
  { url: "https://www.bloomberg.com/feed/podcast/etf-report.xml", name: "Bloomberg", region: "US", bias: "center" },
  { url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml", name: "Wall Street Journal", region: "US", bias: "center" },
  { url: "https://www.politico.com/rss/politicopicks.xml", name: "Politico", region: "US", bias: "left" },
  { url: "https://nypost.com/feed/", name: "New York Post", region: "US", bias: "right" },

  // ── 🇬🇧 UK ──
  { url: "https://feeds.bbci.co.uk/news/rss.xml", name: "BBC News", region: "GB", bias: "center" },
  { url: "https://www.theguardian.com/world/rss", name: "The Guardian", region: "GB", bias: "left" },
  { url: "https://www.telegraph.co.uk/rss.xml", name: "The Telegraph", region: "GB", bias: "center" },
  { url: "https://feeds.skynews.com/feeds/rss/home.xml", name: "Sky News", region: "GB", bias: "center" },
  { url: "https://www.ft.com/rss/home", name: "Financial Times", region: "GB", bias: "center" },

  // ── 🌍 GLOBAL / INTERNATIONAL ──
  { url: "https://www.reutersagency.com/feed/?best-topics=business-finance", name: "Reuters", region: "GLOBAL", bias: "center" },
  { url: "https://apnews.com/rss", name: "Associated Press", region: "GLOBAL", bias: "center" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", name: "Al Jazeera", region: "GLOBAL", bias: "center" },
  { url: "https://www.france24.com/en/rss", name: "France 24", region: "GLOBAL", bias: "center" },
  { url: "https://rss.dw.com/xml/rss-en-all", name: "Deutsche Welle", region: "GLOBAL", bias: "center" },
  { url: "https://www.euronews.com/rss", name: "Euronews", region: "GLOBAL", bias: "center" },

  // ── 🌏 ASIA ──
  { url: "https://www.scmp.com/rss/91/feed", name: "South China Morning Post", region: "ASIA", bias: "center" },
  { url: "https://www.japantimes.co.jp/feed/topstories/", name: "Japan Times", region: "ASIA", bias: "center" },
  { url: "https://www.straitstimes.com/news/rss.xml", name: "Straits Times", region: "ASIA", bias: "center" },
  { url: "https://www.channelnewsasia.com/rssfeeds/8395986", name: "Channel News Asia", region: "ASIA", bias: "center" },
  { url: "https://www.dawn.com/feeds/home", name: "Dawn", region: "ASIA", bias: "center" },

  // ── 🌍 AFRICA ──
  { url: "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf", name: "AllAfrica", region: "AFRICA", bias: "center" },
  { url: "https://www.news24.com/rss", name: "News24", region: "AFRICA", bias: "center" },

  // ── 🌎 LATIN AMERICA ──
  { url: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml", name: "Folha de S.Paulo", region: "LATAM", bias: "center" },
  { url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", name: "El País", region: "LATAM", bias: "center" },
];

async function fetchFromRSS(feed: { url: string; name: string }): Promise<ArticleToProcess[]> {
  try {
    const parser = new Parser({
      timeout: 10000,
      customFields: {
        item: ['media:content', 'media:thumbnail', 'enclosure'],
      }
    });
    
    const feedData = await parser.parseURL(feed.url);
    
    return (feedData.items || []).map((item) => {
      let image = item.enclosure?.url;
      if (!image && item['media:content'] && item['media:content']['$'] && item['media:content']['$'].url) {
        image = item['media:content']['$'].url;
      }
      if (!image && item['media:thumbnail'] && item['media:thumbnail']['$'] && item['media:thumbnail']['$'].url) {
        image = item['media:thumbnail']['$'].url;
      }
      
      return {
        title: item.title || "Untitled",
        description: item.contentSnippet || item.content || "",
        content: item.content || "",
        url: item.link || "",
        image: image,
        publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
        source: { name: feed.name, url: feed.url }
      };
    });
  } catch (err) {
    console.warn(`[news-fetcher] Native RSS fetch failed for ${feed.name}:`, err);
    return [];
  }
}

async function fetchFromGNews(apiKey: string, category?: string, query?: string): Promise<GNewsArticle[]> {
  try {
    let url = "";
    if (query) {
      url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=10&apikey=${apiKey}`;
    } else {
      url = `https://gnews.io/api/v4/top-headlines?category=${category || "general"}&lang=en&max=10&apikey=${apiKey}`;
    }
    
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`GNews ${category || query} failed: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return data.articles || [];
  } catch (err) {
    console.warn(`GNews ${category || query} error:`, err);
    return [];
  }
}

async function fetchFromNewsAPI(apiKey: string, category?: string, query?: string): Promise<NewsAPIArticle[]> {
  try {
    let url = "";
    if (query) {
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&pageSize=20&apiKey=${apiKey}`;
    } else {
      url = `https://newsapi.org/v2/top-headlines?language=en&pageSize=40&apiKey=${apiKey}${category ? `&category=${category}` : ""}`;
    }
    
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`NewsAPI ${category || query} failed: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return data.articles || [];
  } catch (err) {
    console.warn("NewsAPI error:", err);
    return [];
  }
}

const GOOGLE_NEWS_TOPICS = [
  // Technology & Future
  "Technology", "Artificial Intelligence", "Generative AI", "Semiconductors", "Cybersecurity", 
  "Quantum Computing", "Space Exploration", "Robotics", "Clean Energy", "Biotechnology",
  // Finance & Markets
  "Stock Market", "Global Economy", "Venture Capital", "Cryptocurrency", "Real Estate",
  "Central Banks", "Inflation", "Trade Policy", "E-commerce", "Startups",
  // Politics & World
  "US Politics", "UK News", "European Union", "China Strategy", "Middle East Conflict",
  "United Nations", "NATO", "Foreign Policy", "Election 2024", "Diplomacy",
  // Science & Environment
  "Climate Change", "Renewable Energy", "Astrophysics", "Genetics", "Neuroscience",
  "Conservation", "Natural Disasters", "Ocean Health", "Agriculture", "Sustainability",
  // Health & Society
  "Public Health", "Mental Health", "Longevity", "Nutrition", "Epidemiology",
  "Education Reform", "Human Rights", "Social Justice", "Urban Planning", "Workforce Trends",
  // Sports & Entertainment
  "Formula 1", "Premier League", "NBA", "Tennis", "Golf",
  "Streaming Wars", "Gaming Industry", "Music Trends", "Hollywood", "Art World",
  // Local/Niche but Important
  "Consumer Tech", "Privacy", "Infrastructure", "Transportation", "Logistics"
];

async function fetchFromGoogleNewsRSS(topic: string, settings: { country: string, language: string, ceid: string }): Promise<ArticleToProcess[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=${settings.language}-${settings.country}&gl=${settings.country}&ceid=${settings.ceid}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    
    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    
    const articles: ArticleToProcess[] = [];
    $('item').each((_, el) => {
      const title = $(el).find('title').text();
      const link = $(el).find('link').text();
      const pubDate = $(el).find('pubDate').text();
      const sourceName = $(el).find('source').text() || "Google News";
      
      articles.push({
        title,
        url: link,
        publishedAt: pubDate,
        source: { name: sourceName, url: link }
      });
    });
    return articles;
  } catch (err) {
    console.warn(`Google News RSS fetch failed for ${topic}:`, err);
    return [];
  }
}

interface ArticleContext {
  id: string;
  title: string;
  description: string;
  publishedAt: string | null;
  clusterId: string;
}

// ── MODULE 6: PAIRWISE SIMILARITY SCORING ──
function extractTokens(text: string): Set<string> {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, "").trim();
  const words = normalized.split(/\s+/).filter(w => w.length > 3);
  const stopWords = new Set(["this", "that", "with", "from", "they", "will", "would", "could", "should", "what", "when", "where", "which", "there", "their", "have", "been", "were", "also", "into", "over", "after", "some", "them", "because", "about", "these", "only"]);
  return new Set(words.filter(w => !stopWords.has(w)));
}

function extractEntities(title: string, description: string): Set<string> {
  const text = `${title} ${description || ""}`;
  // Simple heuristic: extract capitalized words as pseudo-entities
  const matches = text.match(/\b[A-Z][a-z]+\b/g) || [];
  return new Set(matches);
}

function calculateSimilarityScore(artNew: ArticleToProcess, artExisting: ArticleContext): { score: number, reasons: any } {
  // 1. Title Token Jaccard (w = 0.40)
  const tokensA = extractTokens(artNew.title);
  const tokensB = extractTokens(artExisting.title);
  const intersectionTokens = Array.from(tokensA).filter(t => tokensB.has(t)).length;
  const unionTokens = new Set(Array.from(tokensA).concat(Array.from(tokensB))).size;
  const titleJaccard = unionTokens > 0 ? intersectionTokens / unionTokens : 0;
  
  // 2. Entity Overlap (w = 0.40)
  const entitiesA = extractEntities(artNew.title, artNew.description || "");
  const entitiesB = extractEntities(artExisting.title, artExisting.description || "");
  const intersectionEntities = Array.from(entitiesA).filter(e => entitiesB.has(e)).length;
  const unionEntities = new Set(Array.from(entitiesA).concat(Array.from(entitiesB))).size;
  const entityJaccard = unionEntities > 0 ? intersectionEntities / unionEntities : 0;
  
  // 3. Time Proximity Score (w = 0.20)
  let timeScore = 0.5; // Default if no dates
  if (artNew.publishedAt && artExisting.publishedAt) {
    const tA = new Date(artNew.publishedAt).getTime();
    const tB = new Date(artExisting.publishedAt).getTime();
    if (!isNaN(tA) && !isNaN(tB)) {
      const diffHours = Math.abs(tA - tB) / (1000 * 60 * 60);
      timeScore = Math.max(0, 1 - (diffHours / 72));
    }
  }
  
  const w_t = 0.40;
  const w_ent = 0.40;
  const w_time = 0.20;
  
  const compositeScore = (w_t * titleJaccard) + (w_ent * entityJaccard) + (w_time * timeScore);
  
  return { 
    score: compositeScore, 
    reasons: { titleJaccard, entityJaccard, timeScore } 
  };
}

// ── MODULE 7: CLUSTERING / STORY FORMATION ──
function findCluster(art: ArticleToProcess, existingMap: Map<string, ArticleContext>): string | null {
  let bestClusterId: string | null = null;
  let highestScore = 0;
  
  for (const [id, existing] of Array.from(existingMap.entries())) {
    if (art.title === existing.title) return existing.clusterId;
    
    // Fallback for short identical titles
    const normA = art.title.toLowerCase().replace(/[^\w\s]/g, "").trim();
    const normB = existing.title.toLowerCase().replace(/[^\w\s]/g, "").trim();
    if (normA.length > 15 && (normA.includes(normB) || normB.includes(normA))) {
       return existing.clusterId; 
    }
    
    const { score } = calculateSimilarityScore(art, existing);
    if (score > highestScore) {
      highestScore = score;
      bestClusterId = existing.clusterId;
    }
  }
  
  // Threshold: S >= 0.18 (Lowered to ensure 50+ sources per trending topic)
  if (highestScore >= 0.18) {
    return bestClusterId;
  }
  
  return null;
}

interface ArticleToProcess {
  title: string;
  description?: string;
  content?: string;
  url: string;
  image?: string;
  publishedAt: string;
  source: {
    name: string;
    url?: string;
  };
}

async function processArticle(
  art: ArticleToProcess, 
  catMap: Record<string, string>,
  systemUser: any,
  publisherArticles: Map<string, Set<string>>,
  existingGroups: Map<string, ArticleContext>
): Promise<string | null> {
  if (!art.title || art.title === "[Removed]") return null;
        
  const pubInfo = lookupPublisherInfo(art.source.name, art.source.url);
  const pubSlug = slugify(art.source.name);
  
  let publisher = (await storage.listPublishers()).find(p => p.slug === pubSlug);
  if (!publisher) {
    publisher = await storage.createPublisher({
      name: art.source.name,
      slug: pubSlug,
      description: `News source: ${art.source.name}`,
      logoUrl: null,
      website: art.source.url || null,
      biasRating: pubInfo.bias,
      factualityRating: pubInfo.factuality,
      ownerName: pubInfo.ownerName,
      ownerType: pubInfo.ownerType,
      country: "US", // Default for now
      language: "en", // Default for now
    });
  }
  
  // Check if THIS publisher already added THIS exact story
  const existingPubArticles = publisherArticles.get(publisher.id);
  if (existingPubArticles && Array.from(existingPubArticles).some(title => {
    const words1 = new Set(title.toLowerCase().split(/\s+/));
    const words2 = new Set(art.title.toLowerCase().split(/\s+/));
    const intersection = Array.from(words1).filter(w => words2.has(w)).length;
    return (intersection / Math.max(words1.size, words2.size)) > 0.7; 
  })) {
    return null; 
  }
  
  const clusterId = findCluster(art, existingGroups);
  const groupId = clusterId || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7));
  
  const categorySlug = guessCategory(art.title, art.description);
  const categoryId = catMap[categorySlug] || catMap["politics"];
  const articleSlug = slugify(art.title) + "-" + Date.now().toString(36);
  const articleId = crypto.createHash('md5').update(art.url + art.title).digest('hex');
  
  const created = await storage.createArticle({
    id: articleId,
    publisherId: publisher.id,
    authorId: systemUser.id,
    title: art.title,
    slug: articleSlug,
    excerpt: art.description || art.title,
    bodyHtml: `<p>${art.description || ""}</p><p>${art.content || ""}</p><p><a href="${art.url}" target="_blank" rel="noopener">Read full article at ${art.source.name} →</a></p>`,
    heroImageUrl: art.image || getFallbackImage(categorySlug),
    sourceUrl: art.url,
    status: "published",
    bias: pubInfo.bias,
    clusterId: clusterId || ((crypto as any).randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).substring(7)),
    importanceScore: 0,
    biasHistory: [],
    aiInsights: [], // Will be populated by synthesizer
  }, categoryId ? [categoryId] : [], []);
  
  await storage.publishArticle(created.id);
  existingGroups.set(created.id, {
    id: created.id,
    title: art.title,
    description: art.description || "",
    publishedAt: art.publishedAt || new Date().toISOString(),
    clusterId: created.clusterId || created.id
  });
  
  // Initialize bias history for this article
  const biasValue = pubInfo.bias || "center";
  await storage.updateArticle(created.id, {
    biasHistory: [{
      timestamp: new Date().toISOString(),
      left: biasValue === "left" ? 1 : 0,
      center: biasValue === "center" ? 1 : 0,
      right: biasValue === "right" ? 1 : 0
    }]
  });
  
  if (!publisherArticles.has(publisher.id)) {
    publisherArticles.set(publisher.id, new Set());
  }
  publisherArticles.get(publisher.id)!.add(art.title);

  return clusterId ? null : art.title; // Return title if it's a NEW cluster for deep search
}

function getFallbackImage(category: string): string {
  const fallbacks: Record<string, string> = {
    politics: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800&q=80",
    technology: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    business: "https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=800&q=80",
    health: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80",
    sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
    world: "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=800&q=80",
  };
  return fallbacks[category] || fallbacks.politics;
}

/**
 * Ground AI Smart Summary
 * Synthesizes 5 unique insight points from a cluster, representing 
 * multiple perspectives (Left, Center, Right) where available.
 */
async function generateSmartSummary(clusterId: string) {
  const { articles: articlesInGroup } = await storage.listArticles({ clusterId, status: "published" });
  
  if (articlesInGroup.length < 2) return;

  const perspectives = {
    left: articlesInGroup.filter(a => a.bias === "left"),
    center: articlesInGroup.filter(a => a.bias === "center"),
    right: articlesInGroup.filter(a => a.bias === "right")
  };

  const candidateSentences: { text: string, bias: string }[] = [];
  articlesInGroup.forEach(art => {
    const text = `${art.title}. ${art.excerpt || ""}`;
    const parts = text.split(/[.!?]\s+/);
    parts.forEach(p => {
      const clean = p.trim().replace(/^["']|["']$/g, "");
      if (clean.length > 50 && clean.length < 200 && !clean.toLowerCase().includes("subscribe") && !clean.toLowerCase().includes("click here")) {
        candidateSentences.push({ text: clean, bias: art.bias });
      }
    });
  });

  // Ranking & Selection Strategy: 1 Left, 1 Right, 1 Center, 2 General
  const finalInsights: { text: string, bias: string }[] = [];
  
  const selectOne = (bias: string) => {
    const pool = candidateSentences.filter(s => s.bias === bias);
    if (pool.length > 0) {
      // Pick longest (usually most descriptive)
      const best = pool.sort((a,b) => b.text.length - a.text.length)[0];
      if (!isRedundant(best.text, finalInsights.map(f => f.text))) {
        finalInsights.push(best);
      }
    }
  };

  const isRedundant = (s: string, existing: string[]) => {
    return existing.some(e => {
      const w1 = new Set(e.toLowerCase().split(/\s+/));
      const w2 = new Set(s.toLowerCase().split(/\s+/));
      const intersect = Array.from(w1).filter(w => w2.has(w)).length;
      return (intersect / Math.min(w1.size, w2.size)) > 0.45;
    });
  };

  selectOne("left");
  selectOne("right");
  selectOne("center");

  // Fill up to 5 points with most descriptive remaining sentences
  const remaining = candidateSentences
    .filter(s => !finalInsights.some(f => f.text === s.text))
    .sort((a,b) => b.text.length - a.text.length);

  for (const s of remaining) {
    if (finalInsights.length >= 5) break;
    if (!isRedundant(s.text, finalInsights.map(f => f.text))) {
      finalInsights.push(s);
    }
  }

  // Formatting with bias markers if possible
  const formattedInsights = finalInsights.map(f => f.text);

  for (const art of articlesInGroup) {
    await storage.updateArticle(art.id, { aiInsights: formattedInsights });
  }
}

export async function fetchRealNews(): Promise<number> {
  console.log("Starting MASSIVE news fetch (20k scale initialization)...");
  
  let systemUser = await storage.getUserByEmail("system@modernnews.com") || 
                     await storage.getUserByEmail("system@newshub.com") ||
                     await storage.getUserByEmail("admin@newshub.com");
                     
  if (!systemUser) {
    // Fallback to ANY user if none of the above exist
    const { users } = await (storage as any).listUsers ? await (storage as any).listUsers() : { users: [] };
    if (users && users.length > 0) {
      systemUser = users[0];
    } else {
      console.error("[news-fetcher] FATAL: No users exist in DB to author fetched articles.");
      return 0;
    }
  }

  const categories = await storage.listCategories();
  const catMap: Record<string, string> = {};
  categories.forEach(c => catMap[c.slug] = c.id);

  const existing = await storage.listArticles({ limit: 2000, offset: 0, status: "published" });
  const existingGroups = new Map<string, ArticleContext>();
  const publisherArticles = new Map<string, Set<string>>();
  
  existing.articles.forEach(a => {
    const clusterId = a.clusterId || a.id;
    existingGroups.set(a.id, {
      id: a.id, title: a.title, description: a.excerpt || "", 
      publishedAt: a.publishedAt?.toISOString() || null, clusterId
    });
    if (!publisherArticles.has(a.publisherId)) publisherArticles.set(a.publisherId, new Set());
    publisherArticles.get(a.publisherId)!.add(a.title);
  });

  const CONCURRENCY_LIMIT = 20; // Increased for enterprise scale
  const sourceChunks: any[][] = [];
  for (let i = 0; i < RSS_SOURCES.length; i += CONCURRENCY_LIMIT) {
    sourceChunks.push(RSS_SOURCES.slice(i, i + CONCURRENCY_LIMIT));
  }

  let articlesAdded = 0;
  for (const chunk of sourceChunks) {
    await Promise.all(chunk.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.url);
        // Process up to 50 items per feed for high density
        for (const item of feed.items.slice(0, 50)) {
          const result = await processArticle({
            title: item.title || "",
            description: item.contentSnippet || (item as any).description || "",
            url: item.link || "",
            image: item.enclosure?.url || (item as any).media?.["$"]?.url || null,
            publishedAt: item.pubDate || new Date().toISOString(),
            source: { name: source.publisherName, url: source.url }
          }, catMap, systemUser, publisherArticles, existingGroups);
          
          if (result) {
            articlesAdded++;
          }
        }
      } catch (err: any) {
        console.warn(`[news-fetcher] Fetch failed for ${source.publisherName}:`, err.message);
      }
    }));
  }

  // Get all unique active clusterIds to synthesize
  const { articles: finalArticles } = await storage.listArticles({ limit: 10000, offset: 0, status: "published" });
  const uniqueClusterIds = new Set(finalArticles.map(a => a.clusterId).filter(Boolean) as string[]);
  
  console.log(`Synthesizing Ground AI Insights for ${uniqueClusterIds.size} clusters...`);
  for (const cid of Array.from(uniqueClusterIds)) {
    await generateSmartSummary(cid);
  }

  await updateBiasSnapshots();
  return articlesAdded;
}

async function updateBiasSnapshots() {
  console.log("[news-fetcher] Updating Narrative Shift snapshots...");
  
  // Get all articles from the last 72 hours (to capture the 48h shift)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  const { articles } = await storage.listArticles({ limit: 2000, offset: 0, status: "published" });
  const recentArticles = articles.filter(a => new Date(a.createdAt) > threeDaysAgo && a.clusterId);
  
  // Group by clusterId
  const groups = new Map<string, Article[]>();
  recentArticles.forEach(a => {
    if (!groups.has(a.clusterId!)) groups.set(a.clusterId!, []);
    groups.get(a.clusterId!)!.push(a);
  });
  
  const entries = Array.from(groups.entries());
  for (const [groupId, groupArticles] of entries) {
    // Calculate current distribution
    const leftCount = groupArticles.filter(a => a.bias === "left").length;
    const centerCount = groupArticles.filter(a => a.bias === "center").length;
    const rightCount = groupArticles.filter(a => a.bias === "right").length;
    
    const snapshot = {
      timestamp: new Date().toISOString(),
      left: leftCount,
      center: centerCount,
      right: rightCount
    };
    
    // Update each article in the group if it's been more than 6 hours since the last snapshot
    for (const art of groupArticles) {
      const history = (art.biasHistory as any[]) || [];
      const lastSnapshot = history[history.length - 1];
      
      const shouldUpdate = !lastSnapshot || 
        (new Date().getTime() - new Date(lastSnapshot.timestamp).getTime() > 6 * 60 * 60 * 1000);
        
      if (shouldUpdate) {
        const newHistory = [...history, snapshot].slice(-10); // Keep last 10 snapshots
        await storage.updateArticle(art.id, { biasHistory: newHistory });
      }
    }
  }
  console.log("[news-fetcher] Narrative Shift snapshots updated.");
}

// Fetch interval: 15 minutes
const FETCH_INTERVAL_MS = 15 * 60 * 1000;
let fetchTimer: NodeJS.Timeout | null = null;

export function startAutoFetch() {
  // Always start auto-fetch now that we have RSS as a free fallback
  console.log("[news-fetcher] Auto-fetch module starting...");
  
  // Initial fetch after 5 seconds (let server start first)
  setTimeout(async () => {
    try {
      await fetchRealNews();
    } catch (err) {
      console.error("[news-fetcher] Initial fetch failed:", err);
    }
  }, 5000);
  
  // Schedule recurring fetches
  fetchTimer = setInterval(async () => {
    try {
      await fetchRealNews();
    } catch (err) {
      console.error("[news-fetcher] Scheduled fetch failed:", err);
    }
  }, FETCH_INTERVAL_MS);
  
  console.log(`[news-fetcher] Auto-fetch enabled. Fetching every ${FETCH_INTERVAL_MS / 60000} minutes.`);
  
  // Queue Scheduler: Reset pending jobs every hour
  setInterval(async () => {
    console.log("[news-fetcher] Resetting fetch queue for next cycle...");
    try {
      await (storage as any).resetFetchQueue();
    } catch (err) {
      console.error("[news-fetcher] Failed to reset fetch queue:", err);
    }
  }, 60 * 60 * 1000);
}

export function stopAutoFetch() {
  if (fetchTimer) {
    clearInterval(fetchTimer);
    fetchTimer = null;
    console.log("[news-fetcher] Auto-fetch stopped.");
  }
}
