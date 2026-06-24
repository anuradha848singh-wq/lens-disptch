import { db } from "../server/db";
import { articles } from "../shared/schema";
import { count } from "drizzle-orm";

(async () => {
  try {
    const [res]: any = await db.select({ value: count() }).from(articles);
    console.log(`DATABASE_CHECK_RESULT: ${res.value}`);
  } catch (err) {
    console.error("DATABASE_CHECK_ERROR:", err);
  }
  process.exit(0);
})();
