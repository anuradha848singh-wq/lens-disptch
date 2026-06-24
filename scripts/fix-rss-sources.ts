import { db } from "../server/db";
import { publishers } from "../shared/schema";
import { eq, like } from "drizzle-orm";
import { DIRECT_RSS_REPLACEMENTS } from "../server/rss-sources";

async function main() {
  console.log("Starting RSS source fix script...");

  // 1. Get all publishers using Google News RSS
  const googlePublishers = await db.select()
    .from(publishers)
    .where(like(publishers.rssUrl, "%news.google.com%"));

  console.log(`Found ${googlePublishers.length} publishers currently using Google News RSS.`);

  let updatedCount = 0;

  for (const pub of googlePublishers) {
    let matchDomain: string | null = null;
    
    // Check if any key in DIRECT_RSS_REPLACEMENTS is in the publisher's current state
    for (const domain of Object.keys(DIRECT_RSS_REPLACEMENTS)) {
      const parts = domain.split('.');
      const domainName = parts[0];
      
      // Stricter matching
      const isMatch = 
        (pub.website && pub.website.toLowerCase().includes(domain)) ||
        (pub.rssUrl && pub.rssUrl.toLowerCase().includes(domain)) ||
        (pub.name && new RegExp(`\\b${domainName}\\b`, 'i').test(pub.name)) ||
        (pub.slug && (pub.slug.toLowerCase() === domainName || pub.slug.toLowerCase().includes(domain)));

      if (isMatch) {
        matchDomain = domain;
        break;
      }
    }

    if (matchDomain) {
      const newRssUrl = DIRECT_RSS_REPLACEMENTS[matchDomain];
      const newWebsite = `https://www.${matchDomain}`;

      console.log(`[MATCH] ${pub.name} -> ${matchDomain}`);
      console.log(`  OLD: ${pub.rssUrl}`);
      console.log(`  NEW: ${newRssUrl}`);

      await db.update(publishers)
        .set({ 
          rssUrl: newRssUrl,
          website: pub.website === "https://news.google.com" ? newWebsite : (pub.website || newWebsite),
          failCount: 0
        })
        .where(eq(publishers.id, pub.id));
      
      updatedCount++;
    } else {
      // console.log(`[SKIP] ${pub.name} (RSS: ${pub.rssUrl})`);
    }
  }

  console.log(`Finished. Updated ${updatedCount} publishers.`);
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
