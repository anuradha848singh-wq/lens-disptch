import { db } from "../server/db.js";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Wiping lastFetchedAt...");
  await db.execute(sql`UPDATE publishers SET last_fetched_at = NULL`);
  console.log("Done.");
  process.exit(0);
}
run().catch(console.error);
