import { db } from "../db";
import { articles } from "../../shared/schema";
import { sql, inArray } from "drizzle-orm";

async function main() {
  try {
    const list = await db.select({
      id: articles.id,
      title: articles.title,
      visibilityState: articles.visibilityState,
      qualityScore: articles.qualityScore,
      trace: articles.trace
    })
    .from(articles)
    .where(inArray(articles.visibilityState, ["low_priority", "hidden"]))
    .limit(20);

    console.log("Dumping 20 low_priority/hidden articles:");
    list.forEach((a, index) => {
      console.log(`\n--- Article #${index + 1} ---`);
      console.log(`Title: ${a.title}`);
      console.log(`Visibility: ${a.visibilityState}`);
      console.log(`Quality Score: ${a.qualityScore}`);
      console.log(`Trace:`, JSON.stringify(a.trace, null, 2));
    });

  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}

main();
