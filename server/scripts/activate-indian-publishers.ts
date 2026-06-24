import { db } from "../db";
import { publishers } from "../../shared/schema";
import { inArray } from "drizzle-orm";
import "dotenv/config";

async function run() {
  console.log("[Activate] Activating Indian publishers...");
  const targetPublishers = [
    'The Hindu', 'Indian Express', 'NDTV', 
    'The Wire', 'LiveMint', 'The Print',
    'Scroll.in', 'Business Standard',
    'Hindustan Times', 'Economic Times',
    'Swarajya', 'Republic World', 'News18',
    'Newslaundry', 'The Quint'
  ];

  try {
    await db.update(publishers)
      .set({ active: true, failCount: 0 })
      .where(inArray(publishers.name, targetPublishers));
    console.log("[Activate] Success: Indian publishers activated and fail counts reset!");
  } catch (err: any) {
    console.error("[Activate] Failed to activate publishers:", err.message);
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
