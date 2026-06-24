import { db } from "../server/db";
import { publishers } from "@shared/schema";
import { eq, isNotNull } from "drizzle-orm";
import { lookupPublisherInfo } from "../server/processing";

async function main() {
  console.log("Starting publisher bias update...");
  const allPublishers = await db.select().from(publishers);
  
  let updatedCount = 0;
  for (const pub of allPublishers) {
    let urlToUse = pub.url || "";
    if (urlToUse && !urlToUse.startsWith('http')) {
      urlToUse = `https://${urlToUse}`;
    }

    const info = lookupPublisherInfo(pub.name, urlToUse);
    // Only update if lookupPublisherInfo found a known domain (meaning it's not the fallback 'center' with 'unknown' domain, 
    // OR if we know for a fact the source is 'center' in our DB)
    if (info.domain !== "unknown") {
      if (pub.biasRating !== info.bias) {
        console.log(`Updating ${pub.name} from bias ${pub.biasRating} to ${info.bias} (Domain: ${info.domain})`);
        await db.update(publishers).set({ biasRating: info.bias }).where(eq(publishers.id, pub.id));
        updatedCount++;
      }
    }
  }
  
  console.log(`Finished. Updated ${updatedCount} publishers.`);
  process.exit(0);
}

main().catch(console.error);
