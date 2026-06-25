import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { articles } from "../shared/schema";

async function run() {
  const result = await db.execute(sql`
    SELECT count(DISTINCT cluster_id) as count 
    FROM ${articles} 
    WHERE visibility_state = 'visible' AND cluster_id IS NOT NULL
  `);
  console.log('Visible clusters:', result.rows);
  process.exit(0);
}

run();
