import { load } from "cheerio";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window as any);

// DOMPurify config: allow safe news content tags, strip everything else
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ["p", "h1", "h2", "h3", "h4", "img", "ul", "ol", "li", "blockquote", "a", "strong", "em", "br", "figure", "figcaption"],
  ALLOWED_ATTR: ["src", "alt", "href", "class", "target", "rel"],
  ALLOW_DATA_ATTR: false,
};

// Per-domain request tracking to avoid 429 rate limiting
const domainLastRequest = new Map<string, number>();
const DOMAIN_MIN_INTERVAL_MS = 2500; // 2.5s cooldown for 100k scale politeness

const PAYWALL_DOMAINS = new Set([
  "ft.com", "wsj.com", "axios.com", "telegraph.co.uk",
  "japantimes.co.jp", "washingtontimes.com", "thehill.com",
  "nytimes.com", "washingtonpost.com", "bloomberg.com",
  "economist.com", "thetimes.co.uk", "theathletic.com",
  "cbsnews.com", "politico.com", "newyorker.com",
  "hbr.org", "foreignpolicy.com", "foreignaffairs.com",
]);

export async function fetchFullContent(url: string): Promise<{
  title: string;
  excerpt: string;
  bodyHtml: string;
  author?: string;
  publishedAt?: string;
  mainImage?: string;
  wordCount?: number;
  readabilityScore?: number;
  isPaywalled?: boolean;
  entities?: {
    persons: string[];
    organizations: string[];
    locations: string[];
  };
} | null> {
  try {
    const scrapedDomain = new URL(url).hostname.replace("www.", "");
    if (PAYWALL_DOMAINS.has(scrapedDomain)) {
      return {
        title: "",
        excerpt: "",
        bodyHtml: "",
        wordCount: 0,
        isPaywalled: true,
      };
    }

    // Rate limit per domain — prevents 429s like spacenews.com
    let domain = "";
    try { domain = new URL(url).hostname; } catch {}
    if (domain) {
      const last = domainLastRequest.get(domain) || 0;
      const wait = DOMAIN_MIN_INTERVAL_MS - (Date.now() - last);
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      domainLastRequest.set(domain, Date.now());
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      console.warn(`Scraper: Failed to fetch ${url} - Status ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = load(html);

    // 1. Basic Metadata
    const title = $("title").text().split("|")[0].split("-")[0].trim() || $("h1").first().text().trim();
    const excerpt = $('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content") || "";
    const mainImage = extractImage(html, url) || "";
    const author = $('meta[name="author"]').attr("content") || $('meta[property="article:author"]').attr("content") || "";
    const publishedAt = $('meta[property="article:published_time"]').attr("content") || $('meta[name="publish-date"]').attr("content") || "";

    // 2. Identify main content area
    // Remove known noise before content extraction
    $("script, style, iframe, nav, footer, aside, header, .ads, .advertisement, .social-share, .recommended, .sidebar, .menu, .comments, .related-posts, .newsletter-signup").remove();

    // Expanded list of common content wrappers for modern news sites
    const selectors = [
      "article",
      "[role='main']",
      ".article-body",
      ".post-content",
      ".entry-content",
      ".story-body",
      ".main-content",
      "#main-content",
      ".article-text",
      ".story-content",
      ".caas-body", // Yahoo
      ".article__content",
      ".content-area",
      ".p-article-content",
      ".l-article-content"
    ];

    let $content: any = $([]);
    for (const selector of selectors) {
      $content = $(selector).first();
      if ($content.length > 0 && $content.find("p").length > 2) break;
    }
    
    // Fallback: Use the parent of the most paragraphs with a Minimum threshold
    if ($content.length === 0 || $content.find("p").length < 3) {
      let maxPCount = 0;
      let $bestCandidate = $("body");
      
      $("div, section, main").each((_, el) => {
        const pCount = $(el).children("p").length;
        if (pCount > maxPCount) {
          maxPCount = pCount;
          $bestCandidate = $(el);
        }
      });
      $content = $bestCandidate;
    }

    // 3. Final cleanup and formatting
    // Use a whitelist of tags to keep the content clean
    const bodyParts: string[] = [];
    $content.find("p, h1, h2, h3, h4, img, ul, ol, blockquote").each((_: any, el: any) => {
      const tagName = el.tagName.toLowerCase();
      const $el = $(el);
      
      // Skip empty elements or elements with too little text (except images)
      if (tagName !== "img" && $el.text().trim().length < 5 && $el.find("img").length === 0) return;
      
      if (tagName === "img") {
        const src = $el.attr("src") || $el.attr("data-src") || $el.attr("srcset")?.split(" ")[0];
        if (src && src.startsWith("http")) {
          bodyParts.push(`<img src="${src}" class="w-full rounded-xl my-6 shadow-sm border border-border/50" alt="Article image" />`);
        }
      } else {
        const content = $el.html()?.trim();
        if (content) {
          // Wrap in appropriate tag but ensure it's not a nested disaster
          bodyParts.push(`<${tagName} class="mb-4">${content}</${tagName}>`);
        }
      }
    });

    const finalBody = DOMPurify.sanitize(bodyParts.join("\n"), PURIFY_CONFIG);
    const cleanText = $content.text().replace(/\s+/g, " ").trim();

    return {
      title: DOMPurify.sanitize(title, { ALLOWED_TAGS: [] }),
      excerpt: DOMPurify.sanitize(excerpt, { ALLOWED_TAGS: [] }),
      bodyHtml: finalBody || `<p class="leading-relaxed text-lg">${DOMPurify.sanitize(excerpt, { ALLOWED_TAGS: [] })}</p>`,
      author: author ? DOMPurify.sanitize(author, { ALLOWED_TAGS: [] }) : undefined,
      publishedAt: publishedAt || undefined,
      mainImage: mainImage || undefined,
      wordCount: (cleanContentMetrics(cleanText) as any).wordCount || 0,
      ...cleanContentMetrics(cleanText)
    };
  } catch (err) {
    console.error(`Scraper error for ${url}:`, err);
    return null;
  }
}

/**
 * Tier 4 CLEAN: Named Entity Recognition & Readability
 * Logic for 100k user scale (Quality Focused)
 */
function cleanContentMetrics(text: string) {
  if (!text || text.length < 50) return {};

  // 1. Flesch-Kincaid Readability
  const sentences = text.split(/[.!?]+\s+/).filter(s => s.length > 5).length || 1;
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length || 1;
  
  // Simple syllable counter
  const syllables = words.reduce((acc, word) => {
    const w = word.toLowerCase().replace(/[^a-z]/g, "");
    if (w.length <= 3) return acc + 1;
    let count = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
                 .replace(/^y/, "")
                 .match(/[aeiouy]{1,2}/g)?.length || 1;
    return acc + count;
  }, 0);

  const readabilityScore = Math.max(0, Math.min(100, 
    206.835 - 1.015 * (wordCount / sentences) - 84.6 * (syllables / wordCount)
  ));

  // 2. NER Extraction (Regex-based Person/Org/Loc)
  const persons = new Set<string>();
  const orgs = new Set<string>();
  const locations = new Set<string>();

  // Simple heuristics for 100k scale (Quality over raw speed)
  const capitalized = text.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b/g) || [];
  capitalized.forEach(name => {
    if (name.length < 4) return;
    if (/(?:Inc|Corp|Group|Bank|Dept|Council|University|Hospital|Network|Times|Post|Journal|Tribune)\b/.test(name)) {
      orgs.add(name);
    } else if (/(?:States|China|Russia|Israel|Ukraine|London|Paris|Berlin|Delhi|Moscow|Washington|Texas|California|Coast|Island|Sea|River)\b/.test(name)) {
      locations.add(name);
    } else if (name.split(" ").length >= 2) {
      persons.add(name);
    }
  });

  return {
    wordCount,
    readabilityScore,
    entities: {
      persons: Array.from(persons).slice(0, 10),
      organizations: Array.from(orgs).slice(0, 10),
      locations: Array.from(locations).slice(0, 10)
    }
  };
}

// Extract image - try multiple sources in order of preference
function extractImage(html: string, baseUrl: string): string | null {
  const $ = load(html);
  
  // 1. og:image (most reliable)
  const ogImage = $('meta[property="og:image"]').attr('content') ||
                  $('meta[property="og:image:url"]').attr('content');
  if (ogImage && isValidImageUrl(ogImage)) return ogImage;
  
  // 2. twitter:image
  const twitterImage = $('meta[name="twitter:image"]').attr('content') ||
                       $('meta[name="twitter:image:src"]').attr('content');
  if (twitterImage && isValidImageUrl(twitterImage)) return twitterImage;
  
  // 3. First large image in article body
  const articleImages = $('article img, .article-body img, .post-content img, main img');
  for (const img of articleImages.toArray()) {
    const src = $(img).attr('src') || $(img).attr('data-src');
    const width = parseInt($(img).attr('width') || '0');
    if (src && isValidImageUrl(src) && (width === 0 || width > 300)) {
      return src.startsWith('http') ? src : new URL(src, baseUrl).href;
    }
  }
  
  // 4. Any img with reasonable size
  const allImages = $('img');
  for (const img of allImages.toArray()) {
    const src = $(img).attr('src') || $(img).attr('data-src');
    if (src && isValidImageUrl(src) && src.startsWith('http')) {
      return src;
    }
  }
  
  return null;
}

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.includes('logo') || url.includes('icon') || 
      url.includes('avatar') || url.includes('badge') ||
      url.includes('lh3.googleusercontent.com')) return false; // reject Google thumbnails
  return url.match(/\.(jpg|jpeg|png|webp|gif)/i) !== null || 
         url.includes('/image/') || 
         url.includes('/images/') ||
         url.includes('/photo/') ||
         url.includes('/media/');
}
