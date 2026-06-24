import { db } from "./server/db";
import { clusters, articles, publishers } from "./shared/schema";
import { desc, eq } from "drizzle-orm";

async function verifyClusters() {
  const topClusters = await db.select()
    .from(clusters)
    .orderBy(desc(clusters.sourceCount))
    .limit(5);
    
  console.log("CLUSTER VERIFICATION (TOP 5):");
  for (const c of topClusters) {
    console.log(`\n==========================================`);
    console.log(`CLUSTER: ${c.headline} (Sources: ${c.sourceCount})`);
    
    const clusterArticles = await db.select({
      title: articles.title,
      publisher: publishers.name,
    })
    .from(articles)
    .leftJoin(publishers, eq(articles.sourceId, publishers.id))
    .where(eq(articles.clusterId, c.id))
    .limit(5);

    for (const a of clusterArticles) {
      console.log(`  - [${a.publisher}] ${a.title}`);
    }
  }
  process.exit(0);
}

verifyClusters().catch(console.error);
