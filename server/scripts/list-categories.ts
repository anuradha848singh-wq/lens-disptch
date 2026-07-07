import { db } from "../db";
import { categories } from "../../shared/schema";

async function main() {
  try {
    const list = await db.select().from(categories);
    console.log("Categories in DB:", list);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

main();
