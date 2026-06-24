import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const res = await pool.query("SELECT source_count, headline FROM clusters ORDER BY source_count DESC LIMIT 10");
  console.log("TOP CLUSTERS BY SOURCE COUNT:");
  res.rows.forEach(r => console.log(`${r.source_count} sources: ${r.headline}`));
  
  const cacheRes = await pool.query("SELECT key, value FROM cache WHERE key = 'homepage_clusters_final'");
  if (cacheRes.rows.length > 0) {
    const data = JSON.parse(cacheRes.rows[0].value);
    console.log(`\nCACHE HAS ${data.length} CLUSTERS. Top 5 in cache:`);
    data.slice(0, 5).forEach((c: any) => console.log(`${c.sourceCount} sources: ${c.headline}`));
  } else {
    console.log("\nNO CACHE FOUND");
  }
  
  await pool.end();
}

run().catch(console.error);
