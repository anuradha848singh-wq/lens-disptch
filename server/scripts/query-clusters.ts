import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const query = `
    SELECT 
      ROUND(AVG(source_count), 2) as avg_sources,
      MAX(source_count) as max_sources,
      COUNT(*) FILTER (WHERE source_count >= 3) as three_plus,
      COUNT(*) as total
    FROM clusters
    WHERE first_seen_at > NOW() - INTERVAL '2 hours';
  `;
  
  try {
    const res = await pool.query(query);
    console.log("\n📊 --- CLUSTER DISTRIBUTION DIAGNOSTICS (LAST 2 HOURS) ---");
    console.table(res.rows);
  } catch (error) {
    console.error("Failed to run diagnostics query:", error);
  } finally {
    await pool.end();
  }
}

run().catch(console.error);
