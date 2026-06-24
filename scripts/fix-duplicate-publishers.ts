import { db } from '../server/db';
import { publishers, articles, clusters } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
  console.log('=== FIXING DUPLICATE PUBLISHERS ===');
  
  // Find all publishers with same name
  const duplicates = await db.execute(sql`
    SELECT name, COUNT(*) as count, 
           array_agg(id ORDER BY reliability_score DESC, created_at ASC) as ids
    FROM publishers
    GROUP BY name
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `);
  
  console.log(`Found ${duplicates.rows.length} duplicate publisher names`);
  
  for (const dup of duplicates.rows) {
    const ids = dup.ids as string[];
    const keepId = ids[0]; // keep oldest
    const removeIds = ids.slice(1); // remove rest
    
    console.log(`Merging ${dup.name}: keeping ${keepId}, removing ${removeIds.length}`);
    
    // Reassign all articles from duplicate publishers to the keeper
    for (const removeId of removeIds) {
      await db.update(articles)
        .set({ sourceId: keepId })
        .where(eq(articles.sourceId, removeId));
    }
    
    // Delete duplicate publisher records
    for (const removeId of removeIds) {
      await db.execute(sql`
        DELETE FROM publishers WHERE id = ${removeId}
      `);
    }
  }
  
  // Also merge publishers where slug matches domain
  // e.g. "economist.com" and "The Economist" are same publisher
  const byDomain = await db.execute(sql`
    SELECT 
      REGEXP_REPLACE(LOWER(website), 'https?://(www\.)?', '') as domain,
      COUNT(*) as count,
      array_agg(id ORDER BY CASE WHEN name LIKE '%.%' THEN 1 ELSE 0 END ASC, reliability_score DESC, created_at ASC) as ids,
      array_agg(name ORDER BY CASE WHEN name LIKE '%.%' THEN 1 ELSE 0 END ASC, reliability_score DESC, created_at ASC) as names
    FROM publishers
    WHERE website IS NOT NULL AND website != ''
    GROUP BY REGEXP_REPLACE(LOWER(website), 'https?://(www\.)?', '')
    HAVING COUNT(*) > 1
  `);
  
  console.log(`Found ${byDomain.rows.length} publishers with same domain`);
  
  for (const dup of byDomain.rows) {
    const ids = dup.ids as string[];
    const names = dup.names as string[];
    const keepId = ids[0];
    const removeIds = ids.slice(1);
    
    console.log(`Merging domain ${dup.domain}: ${names.join(' + ')}`);
    
    for (const removeId of removeIds) {
      await db.update(articles)
        .set({ sourceId: keepId })
        .where(eq(articles.sourceId, removeId));
        
      await db.execute(sql`
        DELETE FROM fetch_queue WHERE publisher_id = ${removeId}
      `);
      
      await db.execute(sql`
        DELETE FROM publishers WHERE id = ${removeId}
      `);
    }
  }
  
  // Recalculate source_count for all clusters
  console.log('Recalculating cluster source counts...');
  
  await db.execute(sql`
    UPDATE clusters c
    SET 
      source_count = subq.real_count,
      pro_establishment_count = subq.pro_establishment_count,
      neutral_count = subq.neutral_count,
      pro_opposition_count = subq.pro_opposition_count
    FROM (
      SELECT 
        a.cluster_id,
        COUNT(DISTINCT a.source_id) as real_count,
        COUNT(DISTINCT CASE WHEN p.bias_rating = 'left' THEN a.source_id END) as pro_establishment_count,
        COUNT(DISTINCT CASE WHEN p.bias_rating = 'center' THEN a.source_id END) as neutral_count,
        COUNT(DISTINCT CASE WHEN p.bias_rating = 'right' THEN a.source_id END) as pro_opposition_count
      FROM articles a
      LEFT JOIN publishers p ON p.id = a.source_id
      WHERE a.cluster_id IS NOT NULL
      GROUP BY a.cluster_id
    ) subq
    WHERE c.id = subq.cluster_id
  `);
  
  console.log('Source counts updated.');
  
  // Show top stories after fix
  const topStories = await db.execute(sql`
    SELECT c.headline, c.source_count,
      STRING_AGG(DISTINCT p.name, ', ') as publishers
    FROM clusters c
    JOIN articles a ON a.cluster_id = c.id
    JOIN publishers p ON p.id = a.source_id
    GROUP BY c.id, c.headline, c.source_count
    HAVING COUNT(DISTINCT a.source_id) > 1
    ORDER BY c.source_count DESC
    LIMIT 10
  `);
  
  console.log('\nTop multi-source stories:');
  console.table(topStories.rows);

  const finalCount = await db.execute(sql`SELECT COUNT(*) FROM publishers`);
  console.log(`Publishers after merge: ${finalCount.rows[0].count}`);
  
  process.exit(0);
}

main().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
