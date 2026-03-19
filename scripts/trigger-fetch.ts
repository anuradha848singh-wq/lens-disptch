import { fetchRealNews } from "../server/news-fetcher";
import { storage } from "../server/storage";

async function main() {
  console.log("Starting manual news fetch...");
  try {
    // Ensure the specific system user expected by the fetcher exists
    const systemEmail = "system@modernnews.com";
    let user;
    try {
        user = await storage.getUserByEmail(systemEmail);
        console.log("System user found:", user.email);
    } catch (e) {
        console.log(`Creating system user (${systemEmail})...`);
        try {
            const result = await (storage as any).createUser(
                { email: systemEmail, passwordHash: "dummy", role: "admin", status: "active" },
                { displayName: "NewsPlatform Admin", avatarUrl: null, bio: "System Author" }
            );
            user = result.user;
            console.log("System user created.");
        } catch (err) {
            console.error("Failed to create user (it might already exist):", err);
        }
    }

    const count = await fetchRealNews();
    console.log(`Fetch completed successfully. Added/Updated ${count} articles.`);
    process.exit(0);
  } catch (err) {
    console.error("Fetch failed:", err);
    process.exit(1);
  }
}

main();
