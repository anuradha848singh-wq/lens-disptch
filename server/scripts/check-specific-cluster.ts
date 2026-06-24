import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const res = await pool.query("SELECT id, source_count FROM clusters WHERE id LIKE 'd521e09b%'");
  console.log("CLUSTER:");
  console.log(res.rows);

  const res2 = await pool.query("SELECT id, title, source_id FROM articles WHERE cluster_id LIKE 'd521e09b%'");
  console.log("ARTICLES:");
  console.log(res2.rows);

  await pool.end();
}

run().catch(console.error);
