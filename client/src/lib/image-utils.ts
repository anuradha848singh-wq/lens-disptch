/**
 * Shared image proxy utility.
 * Proxies external images through weserv.nl for:
 *  - WebP conversion (faster load)
 *  - CORS-safe delivery
 *  - Width-based optimization
 *
 * Previously duplicated in StoryCard.tsx AND EditorialHero.tsx — now single source of truth.
 */
export function proxyImage(url: string | null | undefined, width = 400): string | null {
  if (!url) return null;
  // Don't proxy trusted CDNs that already serve WebP
  if (
    url.includes("unsplash.com") ||
    url.includes("placeholder") ||
    url.includes("images.weserv.nl")
  ) {
    return url;
  }
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp&q=82&maxage=7d`;
}

/**
 * Generates a deterministic gradient fallback for articles with no image.
 * Returns a CSS gradient string based on the article ID so each card
 * has a unique (but stable) color even without a photo.
 */
export function gradientFallback(seed: string): string {
  // Simple deterministic hash
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  const hue1 = Math.abs(h % 360);
  const hue2 = (hue1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 25%, 28%), hsl(${hue2}, 20%, 18%))`;
}
