const { Client } = require('pg');

async function test() {
  const client = new Client({connectionString: 'postgresql://admin:devpassword@localhost:5432/thelensdispatch'});
  await client.connect();
  
  try {
    const clusterRes = await client.query('SELECT id, source_count FROM clusters WHERE source_count >= 1 ORDER BY importance_score DESC NULLS LAST, source_count DESC, last_updated_at DESC LIMIT 200');
    console.log('Found clusters:', clusterRes.rowCount);
    
    if (clusterRes.rowCount === 0) return;
    
    const clusterIds = clusterRes.rows.map(r => r.id);
    const idsList = clusterIds.map(id => `'${id}'`).join(',');
    
    const articlesRes = await client.query(`
      SELECT count(*) FROM (
        SELECT *, ROW_NUMBER() OVER(PARTITION BY cluster_id ORDER BY published_at DESC) as rn 
        FROM articles 
        WHERE cluster_id IN (${idsList}) 
        AND visibility_state = 'visible'
      ) t WHERE rn = 1
    `);
    
    console.log('Latest Articles Count (visible):', articlesRes.rows[0].count);

    const articlesAllRes = await client.query(`
      SELECT count(*) FROM (
        SELECT *, ROW_NUMBER() OVER(PARTITION BY cluster_id ORDER BY published_at DESC) as rn 
        FROM articles 
        WHERE cluster_id IN (${idsList}) 
      ) t WHERE rn = 1
    `);
    
    console.log('Latest Articles Count (ALL):', articlesAllRes.rows[0].count);
  } finally {
    await client.end();
  }
}

test().catch(console.error);
