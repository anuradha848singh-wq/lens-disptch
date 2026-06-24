const { Client } = require('pg');

async function fixSourceCounts() {
  const client = new Client({connectionString: 'postgresql://admin:devpassword@localhost:5432/thelensdispatch'});
  await client.connect();
  
  try {
    console.log("Updating cluster source counts based on unique sources in articles...");
    
    // Update source_count to be the count of unique source_ids per cluster
    const res = await client.query(`
      UPDATE clusters
      SET source_count = sub.cnt
      FROM (
        SELECT cluster_id, COUNT(DISTINCT source_id) as cnt
        FROM articles
        WHERE cluster_id IS NOT NULL
        GROUP BY cluster_id
      ) sub
      WHERE clusters.id = sub.cluster_id;
    `);
    
    console.log(`Updated source_count for ${res.rowCount} clusters.`);
    
    // Also recount the bias counts to be safe
    const res2 = await client.query(`
      UPDATE clusters c
      SET 
        pro_establishment_count = sub.pro_est,
        pro_opposition_count = sub.pro_opp,
        neutral_count = sub.neu
      FROM (
        SELECT 
          a.cluster_id,
          COUNT(CASE WHEN p.bias_rating = 'left' THEN 1 END) as pro_est,
          COUNT(CASE WHEN p.bias_rating = 'right' THEN 1 END) as pro_opp,
          COUNT(CASE WHEN p.bias_rating NOT IN ('left', 'right') THEN 1 END) as neu
        FROM articles a
        LEFT JOIN publishers p ON a.source_id = p.id
        WHERE a.cluster_id IS NOT NULL
        GROUP BY a.cluster_id
      ) sub
      WHERE c.id = sub.cluster_id;
    `);
    console.log(`Updated bias counts for ${res2.rowCount} clusters.`);
    
    console.log("Now rebuilding homepage cache via the processing script...");
    
  } finally {
    await client.end();
  }
}

fixSourceCounts().catch(console.error);
