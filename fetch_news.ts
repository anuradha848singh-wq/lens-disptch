import { fetchRealNews } from "./server/news-fetcher";
import { updateAdminFetcherConfig } from "./server/news-fetcher";

async function runFetcher() {
  console.log("Forcing fetcher to run...");
  updateAdminFetcherConfig({ 
    enabled: true, 
    intervalMinutes: 1, 
    maxArticlesPerFetch: 50 
  });
  const count = await fetchRealNews();
  console.log(`Fetched ${count} articles. Waiting a few seconds for async processing to finish...`);
  
  setTimeout(() => {
    console.log("Done.");
    process.exit(0);
  }, 10000); // give it time for background workers/embeddings
}

runFetcher().catch(console.error);
