import { load } from "cheerio";

export async function fetchFullContent(url: string): Promise<{
  title: string;
  excerpt: string;
  bodyHtml: string;
  author?: string;
  publishedAt?: string;
  mainImage?: string;
} | null> {
  try {
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
    const mainImage = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content") || "";
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

    let $content = $([]);
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
    $content.find("p, h1, h2, h3, h4, img, ul, ol, blockquote").each((_, el) => {
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

    const finalBody = bodyParts.join("\n");

    return {
      title,
      excerpt,
      bodyHtml: finalBody || `<p class="leading-relaxed text-lg">${excerpt}</p>`,
      author: author || undefined,
      publishedAt: publishedAt || undefined,
      mainImage: mainImage || undefined,
    };
  } catch (err) {
    console.error(`Scraper error for ${url}:`, err);
    return null;
  }
}
