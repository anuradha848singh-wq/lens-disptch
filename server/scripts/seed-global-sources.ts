import { db } from "../db";
import { publishers } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { EXTENDED_PUBLISHER_BIAS_DB } from "../publisher-bias-db";

async function seedGlobalSources() {
  console.log("Seeding global sources with deeply mapped ideology and narrative stances...");

  let updatedCount = 0;
  let insertedCount = 0;

  for (const [domain, info] of Object.entries(EXTENDED_PUBLISHER_BIAS_DB)) {
    // Generate a human-readable name from domain (e.g. nytimes.com -> Nytimes) if needed,
    // or just use the domain as the slug.
    const name = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
    
    // Check if the publisher already exists by slug (domain)
    const existing = await db.query.publishers.findFirst({
      where: eq(publishers.slug, domain),
    });

    const data = {
      name: name,
      slug: domain,
      website: `https://${domain}`,
      politicalAlignment: info.politicalAlignment,
      narrativeStance: info.narrativeStance,
      factualityRating: info.factuality,
      region: info.region,
      ownerName: info.ownerName,
      ownerType: info.ownerType,
      country: info.country || "US",
    };

    if (existing) {
      await db.update(publishers)
        .set(data)
        .where(eq(publishers.id, existing.id));
      updatedCount++;
    } else {
      await db.insert(publishers).values(data);
      insertedCount++;
    }
  }

  console.log(`Finished seeding sources. Inserted: ${insertedCount}, Updated: ${updatedCount}.`);
  process.exit(0);
}

seedGlobalSources().catch(console.error);
