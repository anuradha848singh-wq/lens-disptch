/**
 * Backfill Publisher Bias Ratings
 * 
 * Fixes 🟡-1: Ensures all publishers in DB have correct biasRating from EXTENDED_PUBLISHER_BIAS_DB.
 * This resolves the bucket aggregation bug where most articles show as "neutral" because
 * publisher.biasRating was never populated.
 */

import { db } from "../server/db";
import { publishers } from "../shared/schema";
import { EXTENDED_PUBLISHER_BIAS_DB } from "../server/publisher-bias-db";
import { eq } from "drizzle-orm";

async function backfillPublisherBias() {
  console.log("🔄 Starting publisher bias backfill...\n");

  const allPublishers = await db.select().from(publishers);
  
  let updated = 0;
  let notFound = 0;
  let alreadyCorrect = 0;

  for (const pub of allPublishers) {
    // Try to match by domain - extract from website or name
    let domain = "";
    
    if (pub.website) {
      domain = pub.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
    } else if (pub.name) {
      // Try to extract domain from name (e.g., "CNN" -> "cnn.com")
      const nameLower = pub.name.toLowerCase();
      // Check if name contains a domain-like string
      const domainMatch = nameLower.match(/([a-z0-9-]+\.[a-z]{2,})/);
      if (domainMatch) {
        domain = domainMatch[1];
      }
    }
    
    let pubInfo = EXTENDED_PUBLISHER_BIAS_DB[domain];
    
    // Fallback: try common domain patterns
    if (!pubInfo && pub.name) {
      const nameLower = pub.name.toLowerCase().replace(/[^a-z]/g, "");
      const commonDomains = [
        `${nameLower}.com`,
        `${nameLower}.org`,
        `${nameLower}.co.uk`,
        `www.${nameLower}.com`,
      ];
      
      for (const testDomain of commonDomains) {
        if (EXTENDED_PUBLISHER_BIAS_DB[testDomain]) {
          pubInfo = EXTENDED_PUBLISHER_BIAS_DB[testDomain];
          domain = testDomain;
          break;
        }
      }
    }

    if (!pubInfo) {
      console.log(`⚠️  No bias data for: ${pub.name} (${domain || 'no domain'})`);
      notFound++;
      continue;
    }

    const correctBias = pubInfo.bias;
    const correctFactuality = pubInfo.factuality;
    const currentBias = pub.biasRating;

    if (currentBias === correctBias && pub.factualityRating === correctFactuality) {
      alreadyCorrect++;
      continue;
    }

    console.log(`✅ Updating ${pub.name}:`);
    console.log(`   ${currentBias || "(null)"} → ${correctBias}`);
    console.log(`   Factuality: ${correctFactuality}`);

    await db.update(publishers)
      .set({
        biasRating: correctBias,
        factualityRating: correctFactuality,
        ownerName: pubInfo.ownerName,
        ownerType: pubInfo.ownerType,
      })
      .where(eq(publishers.id, pub.id));

    updated++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Already correct: ${alreadyCorrect}`);
  console.log(`   ⚠️  Not found in bias DB: ${notFound}`);
  console.log(`   📝 Total publishers: ${allPublishers.length}`);
}

backfillPublisherBias()
  .then(() => {
    console.log("\n✨ Bias backfill complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Error:", err);
    process.exit(1);
  });
