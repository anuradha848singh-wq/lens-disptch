import { storage } from "../storage";

async function run() {
  const { articles } = await storage.listArticles({ clusterId: "d521e09b-9e87-4827-8807-2bf9c1cf428e" });
  console.log("Returned articles from storage:");
  articles.forEach((a: any) => {
    console.log(`id: ${a.id}`);
    console.log(`sourceId: ${a.sourceId}`);
    console.log(`publisher object: ${!!a.publisher}`);
  });
}

run().catch(console.error);
