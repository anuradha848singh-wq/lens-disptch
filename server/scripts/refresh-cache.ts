import { updateHomepageCache } from "../processing";
import { cache } from "../cache";

async function main() {
  try {
    console.log("Invalidating homepage Redis cache...");
    // Clear all general homepage Redis caches
    await cache.invalidatePattern("homepage_clusters_*");
    await cache.delete("homepage_clusters_final");

    console.log("Triggering materialized homepage cache update...");
    await updateHomepageCache();
    console.log("Materialized homepage cache successfully updated!");
  } catch (e) {
    console.error("Cache refresh failed:", e);
  }
  process.exit(0);
}

main();
