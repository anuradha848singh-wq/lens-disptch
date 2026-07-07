import { db } from "../server/db";
import { homepageCache } from "../shared/schema";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const list = await db.select().from(homepageCache);
    let mockFound = false;
    for (const row of list) {
      const dataStr = JSON.stringify(row.data);
      if (dataStr.includes("mock-1") || dataStr.includes("mock")) {
        console.log(`Mock found in category: ${row.categorySlug}`);
        mockFound = true;
      }
    }
    console.log(mockFound ? "Yes, mock articles are cached!" : "No mock articles in cache.");
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}

run();
