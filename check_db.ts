import { db } from './server/db';
import { articles, clusters } from './shared/schema';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const list = await db.select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      status: articles.status,
      visibilityState: articles.visibilityState
    }).from(articles).limit(5);
    console.log('Sample Articles:', JSON.stringify(list, null, 2));

    const totalPublished = await db.select({ count: sql<number>`count(*)` }).from(articles).where(sql`status = 'published'`);
    console.log('Total Published:', totalPublished[0].count);

    const totalUnpublished = await db.select({ count: sql<number>`count(*)` }).from(articles).where(sql`status != 'published'`);
    console.log('Total Unpublished:', totalUnpublished[0].count);

  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}

run();
