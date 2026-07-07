import { db } from "../server/db";
import { publishers } from "../shared/schema";
import { sql } from "drizzle-orm";

async function checkCountries() {
  const result = await db.select({
    country: publishers.country,
    count: sql<number>`count(*)`
  }).from(publishers).groupBy(publishers.country);

  console.log("Publisher Country Distribution:");
  result.forEach(row => {
    console.log(`Country: ${row.country === null ? 'NULL' : row.country} | Count: ${row.count}`);
  });
  process.exit(0);
}

checkCountries().catch(console.error);
