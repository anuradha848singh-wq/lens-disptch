import { db } from "../db";
import { clusters, publishers, articles } from "../../shared/schema";
import { sql, eq } from "drizzle-orm";

async function main() {
  try {
    console.log("Updating clusters primary_market using origin publisher country...");
    
    // Set clusters.primaryMarket to publishers.country where clusters.originPublisherId = publishers.id
    const result = await db.execute(sql`
      UPDATE clusters
      SET primary_market = publishers.country
      FROM publishers
      WHERE clusters.origin_publisher_id = publishers.id
    `);
    
    console.log("Updated clusters primary_market based on origin publisher country.");

    // Update clusters.multiMarket to hold all unique country codes from articles associated with that cluster
    console.log("Updating multi_market arrays for all clusters...");
    
    const clusterArticles = await db.execute(sql`
      SELECT a.cluster_id, string_agg(DISTINCT p.country, ',') as countries
      FROM articles a
      JOIN publishers p ON a.source_id = p.id
      WHERE a.cluster_id IS NOT NULL
      GROUP BY a.cluster_id
    `);

    let updatedCount = 0;
    for (const row of clusterArticles.rows) {
      const clusterId = row.cluster_id;
      const countries = (row.countries as string).split(',').filter(Boolean);
      
      // Update multiMarket JSONB column with unique countries list
      await db.update(clusters)
        .set({
          multiMarket: countries
        })
        .where(eq(clusters.id, clusterId));
      
      updatedCount++;
      if (updatedCount % 500 === 0) {
        console.log(`Updated multiMarket for ${updatedCount} clusters.`);
      }
    }

    console.log(`Success! Completed market backfill for ${updatedCount} clusters.`);

  } catch (e) {
    console.error("Market backfill failed:", e);
  }
  process.exit(0);
}

main();
