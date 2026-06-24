import { db } from "./db";
import { publishers } from "../shared/schema";
import { eq, sql } from "drizzle-orm";
import { EXTENDED_PUBLISHER_BIAS_DB } from "./publisher-bias-db";
import { RSS_SOURCES } from "./rss-sources";

// Build a set of known-good publisher names from RSS sources
const KNOWN_PUBLISHER_NAMES = new Set(
  Object.values(RSS_SOURCES).flat().map(s => s.name.toLowerCase())
);

// Build domain-to-bias lookup
const DOMAIN_MAP = new Map<string, { domain: string; info: typeof EXTENDED_PUBLISHER_BIAS_DB[string] }>();
for (const [domain, info] of Object.entries(EXTENDED_PUBLISHER_BIAS_DB)) {
  // Create multiple lookup keys for each domain
  const base = domain.replace(/\.(com|org|co\.uk|in|co\.jp|com\.au|co\.za|co\.ke|com\.my|net|ch|jp)$/i, "");
  const slug = base.replace(/\./g, "-");
  DOMAIN_MAP.set(domain, { domain, info });
  DOMAIN_MAP.set(slug, { domain, info });
  DOMAIN_MAP.set(base.replace(/\./g, ""), { domain, info });
}

// Exact name match lookup
const EXACT_NAMES: Record<string, string> = {
  "reuters": "reuters.com",
  "associated press": "apnews.com",
  "ap": "apnews.com",
  "bbc news": "bbc.com",
  "bbc news uk": "bbc.com",
  "bbc world": "bbc.com",
  "al jazeera": "aljazeera.com",
  "al jazeera en": "aljazeera.com",
  "france 24": "france24.com",
  "france24 news": "france24.com",
  "deutsche welle": "dw.com",
  "dw world": "dw.com",
  "the economist": "economist.com",
  "economist week": "economist.com",
  "financial times": "ft.com",
  "south china morning post": "scmp.com",
  "scmp": "scmp.com",
  "euronews": "euronews.com",
  "swissinfo": "swissinfo.ch",
  "rt news": "rt.com",
  "project syndicate": "project-syndicate.org",
  "cnn": "cnn.com",
  "new york times": "nytimes.com",
  "washington post": "washingtonpost.com",
  "fox news": "foxnews.com",
  "wall street journal": "wsj.com",
  "wsj": "wsj.com",
  "politico": "politico.com",
  "the atlantic": "theatlantic.com",
  "npr": "npr.org",
  "abc news": "abcnews.go.com",
  "cbs news": "cbsnews.com",
  "the hill": "thehill.com",
  "axios": "axios.com",
  "daily wire": "dailywire.com",
  "breitbart": "breitbart.com",
  "breitbart news": "breitbart.com",
  "breitbart politics": "breitbart.com",
  "new york post": "nypost.com",
  "ny post": "nypost.com",
  "national review": "nationalreview.com",
  "huffpost": "huffpost.com",
  "vox": "vox.com",
  "mother jones": "motherjones.com",
  "the intercept": "theintercept.com",
  "salon": "salon.com",
  "slate": "slate.com",
  "propublica": "propublica.org",
  "la times": "latimes.com",
  "la times world": "latimes.com",
  "washington times": "washingtontimes.com",
  "raw story": "rawstory.com",
  "daily kos": "dailykos.com",
  "counterpunch": "counterpunch.org",
  "reason": "reason.com",
  "cnbc": "cnbc.com",
  "marketwatch": "marketwatch.com",
  "foreign policy": "foreignpolicy.com",
  "foreign affairs": "foreignaffairs.com",
  "the new yorker": "newyorker.com",  
  "the guardian": "theguardian.com",
  "the guardian uk": "theguardian.com",
  "the independent": "independent.co.uk",
  "the telegraph": "telegraph.co.uk",
  "sky news": "skynews.com",
  "sky news uk": "skynews.com",
  "the sun": "thesun.co.uk",
  "daily mirror": "mirror.co.uk",
  "irish times": "irishtimes.com",
  "el país": "elpais.com",
  "el país (english)": "elpais.com",
  "the hindu": "thehindu.com",
  "indian express": "indianexpress.com",
  "ndtv": "ndtv.com",
  "times of india": "timesofindia.indiatimes.com",
  "hindustan times": "hindustantimes.com",
  "news18": "news18.com",
  "economic times": "economictimes.indiatimes.com",
  "the economic times": "economictimes.indiatimes.com",
  "business standard": "business-standard.com",
  "zee news": "zeenews.india.com",
  "scroll": "scroll.in",
  "the quint": "thequint.com",
  "the wire": "thewire.in",
  "opindia": "opindia.com",
  "swarajya": "swarajyamag.com",
  "the print": "print.in",
  "livemint": "livemint.com",
  "livemint politics": "livemint.com",
  "japan times": "japantimes.co.jp",
  "the japan times": "japantimes.co.jp",
  "sydney morning herald": "smh.com.au",
  "straits times": "straitstimes.com",
  "the straits times": "straitstimes.com",
  "bangkok post": "bangkokpost.com",
  "jakarta post": "jakartapost.com",
  "the jakarta post": "jakartapost.com",
  "jerusalem post": "jpost.com",
  "the jerusalem post": "jpost.com",
  "haaretz": "haaretz.com",
  "times of israel": "timesofisrael.com",
  "the times of israel": "timesofisrael.com",
  "kyiv post": "kyivpost.com",
  "cbc": "cbc.ca",
  "globe and mail": "globeandmail.com",
  "the globe and mail": "globeandmail.com",
  "national post": "nationalpost.com",
  "daily maverick": "dailymaverick.co.za",
  "premium times": "premiumtimesng.com",
  "premium times (nigeria)": "premiumtimesng.com",
  "techcrunch": "techcrunch.com",
  "the verge": "theverge.com",
  "wired": "wired.com",
  "ars technica": "arstechnica.com",
  "nature": "nature.com",
  "scientific american": "scientificamerican.com",
  "nbc news": "nbcnews.com",
  "bloomberg": "bloomberg.com",
  "usa today": "usatoday.com",
  "pbs": "pbs.org",
  "forbes": "forbes.com",
  "newsmax": "newsmax.com",
  "chicago tribune": "chicagotribune.com",
  "boston globe": "bostonglobe.com",
  "msnbc": "msnbc.com",
};

function matchPublisher(pub: { name: string; slug: string; website: string | null }): string | null {
  // 1. Exact name match
  const nameLower = pub.name.toLowerCase().trim();
  if (EXACT_NAMES[nameLower]) return EXACT_NAMES[nameLower];
  
  // 2. Website domain match
  if (pub.website) {
    try {
      const hostname = new URL(pub.website).hostname.replace("www.", "");
      if (EXTENDED_PUBLISHER_BIAS_DB[hostname]) return hostname;
    } catch {}
  }
  
  // 3. Slug matches a domain exactly
  const slugAsDomain = pub.slug.replace(/-/g, ".") + ".com";
  if (EXTENDED_PUBLISHER_BIAS_DB[pub.slug.replace(/-/g, ".")]) {
    return pub.slug.replace(/-/g, ".");
  }
  
  // 4. Domain key stored as slug
  for (const domain of Object.keys(EXTENDED_PUBLISHER_BIAS_DB)) {
    const domainSlug = domain.replace(/\./g, "");
    const pubSlugClean = pub.slug.replace(/-/g, "");
    if (pubSlugClean === domainSlug) return domain;
  }

  return null;
}

async function cleanupPublishers() {
  console.log("🧹 Publisher Cleanup (Precise Mode)\n");

  const allPubs = await db.select().from(publishers);
  console.log(`Found ${allPubs.length} total publishers\n`);

  let updated = 0;
  let deactivated = 0;
  const seenDomains = new Set<string>();

  for (const pub of allPubs) {
    const matchedDomain = matchPublisher({ 
      name: pub.name, 
      slug: pub.slug, 
      website: pub.website 
    });

    if (matchedDomain && !seenDomains.has(matchedDomain)) {
      const info = EXTENDED_PUBLISHER_BIAS_DB[matchedDomain];
      if (!info) {
        // Domain matched but not in bias DB — deactivate
        await db.update(publishers).set({ active: false }).where(eq(publishers.id, pub.id));
        deactivated++;
        continue;
      }
      seenDomains.add(matchedDomain);
      await db.update(publishers).set({
        biasRating: info.bias as any,
        factualityRating: info.factuality as any,
        ownerName: info.ownerName,
        ownerType: info.ownerType as any,
        active: true,
      }).where(eq(publishers.id, pub.id));
      updated++;
      console.log(`  ✅ ${pub.name} → ${info.bias} [${matchedDomain}]`);
    } else if (matchedDomain && seenDomains.has(matchedDomain)) {
      // Duplicate — deactivate
      await db.update(publishers).set({ active: false }).where(eq(publishers.id, pub.id));
      deactivated++;
      console.log(`  🔄 DUPE deactivated: ${pub.name} (${pub.slug})`);
    } else {
      await db.update(publishers).set({ active: false }).where(eq(publishers.id, pub.id));
      deactivated++;
    }
  }

  // Final count
  const activePubs = await db.select().from(publishers).where(eq(publishers.active, true));
  const biasCounts: Record<string, number> = {};
  for (const p of activePubs) {
    biasCounts[p.biasRating || "unknown"] = (biasCounts[p.biasRating || "unknown"] || 0) + 1;
  }

  console.log(`\n📊 Final Results:`);
  console.log(`   Matched & updated: ${updated}`);
  console.log(`   Deactivated: ${deactivated}`);
  console.log(`\n🎯 Active Publishers by Bias:`);
  for (const [bias, count] of Object.entries(biasCounts).sort()) {
    console.log(`   ${bias}: ${count}`);
  }
  console.log(`   TOTAL ACTIVE: ${activePubs.length}`);
  
  process.exit(0);
}

cleanupPublishers().catch(err => {
  console.error("Failed:", err);
  process.exit(1);
});
