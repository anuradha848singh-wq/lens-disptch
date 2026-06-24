import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const res = await pool.query("SELECT id, title, cluster_id FROM articles ORDER BY published_at DESC LIMIT 50");
  console.log("RECENT ARTICLES:");
  res.rows.forEach(r => console.log(`[${r.cluster_id.substring(0,8)}] ${r.title}`));
  
  await pool.end();
}

run().catch(console.error);
