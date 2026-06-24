import { fetchRealNews } from "../server/news-fetcher";
import { storage } from "../server/storage";
import { seedDatabase } from "../server/seed";

async function main() {
  console.log("Starting manual news fetch...");

  try {
    // Ensure DB is seeded (publishers, categories, tags)
    // In MemStorage, this is required on every script run
    await seedDatabase();

    // Ensure the specific system user expected by the fetcher exists
    const systemEmail = "system@modernnews.com";
    try {
        const user = await storage.getUserByEmail(systemEmail);
        console.log("System user found:", user.email);
    } catch (e) {
        console.log(`Creating system user (${systemEmail})...`);
        try {
            await (storage as any).createUser(
                { email: systemEmail, passwordHash: "dummy", role: "admin", status: "active" },
                { userId: "", displayName: "NewsPlatform Admin", avatarUrl: null, bio: "System Author" }
            );
            console.log("System user created.");
        } catch (err) {
            console.warn("User creation might have already happened:", err.message);
        }
    }

    console.log("[Trigger] Starting fetchRealNews...");
    const count = await fetchRealNews();
    console.log(`[Trigger] Fetch completed. Enqueued/Processed ${count} articles.`);
    process.exit(0);
  } catch (err) {
    console.error("Fetch failed:", err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Unhandle error in trigger-fetch:", err);
  process.exit(1);
});
