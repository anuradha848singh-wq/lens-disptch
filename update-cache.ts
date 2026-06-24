import { updateHomepageCache } from "./server/processing.ts";

async function main() {
  console.log("Rebuilding homepage cache...");
  await updateHomepageCache();
  console.log("Cache rebuilt!");
  process.exit(0);
}

main().catch(console.error);
