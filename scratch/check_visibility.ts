import { db } from '../server/db';
import { articles, clusters } from '../shared/schema';
import { sql, eq, and } from 'drizzle-orm';
import { storage } from '../server/storage';

async function run() {
  try {
    // 1. count by visibility state
    const visCounts = await db.select({
      state: articles.visibilityState,
      count: sql<number>`count(*)`
    }).from(articles).groupBy(articles.visibilityState);
    console.log('Visibility Counts:', visCounts);

    // 2. get total clusters
    const clCounts = await db.select({ count: sql<number>`count(*)` }).from(clusters);
    console.log('Total clusters:', clCounts[0].count);

    // 3. Test getHomepageClusters output directly
    const hp = await storage.getHomepageClusters(10, 0, undefined, undefined, 'GLOBAL');
    console.log('getHomepageClusters returned count:', hp.length);
    if (hp.length > 0) {
      console.log('First article returned:', {
        id: hp[0].id,
        title: hp[0].title,
        status: hp[0].status,
        visibilityState: hp[0].visibilityState
      });
    }
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}

run();
