import { db } from './server/db';
import { articles, clusters } from './shared/schema';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const resA = await db.select({ count: sql<number>`count(*)` }).from(articles);
    console.log('Articles:', resA[0].count);
    const resC = await db.select({ count: sql<number>`count(*)` }).from(clusters);
    console.log('Clusters:', resC[0].count);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}

run();
