import Parser from "rss-parser";
import fs from "fs/promises";
import path from "path";
import { GLOBAL_RSS_SOURCES, RSSSource } from "../server/lib/global-publishers";

const parser = new Parser({
  timeout: 5000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "application/rss+xml, application/rdf+xml;q=0.8, application/atom+xml;q=0.6, application/xml;q=0.4, text/xml;q=0.4"
  }
});

async function verifyFeed(source: RSSSource): Promise<boolean> {
  try {
    const feed = await parser.parseURL(source.url);
    if (feed && feed.items && feed.items.length > 0) {
      return true;
    }
    return false;
  } catch (error: any) {
    console.log(`[FAILED] ${source.name} (${source.url}) - Error: ${error.message}`);
    return false;
  }
}

async function run() {
  console.log("Starting RSS Feed Verification...");
  const verifiedSources: Record<string, RSSSource[]> = {};
  let total = 0;
  let successful = 0;

  for (const [category, sources] of Object.entries(GLOBAL_RSS_SOURCES)) {
    verifiedSources[category] = [];
    console.log(`\nVerifying category: ${category} (${sources.length} sources)`);
    
    // Process in batches of 5
    for (let i = 0; i < sources.length; i += 5) {
      const batch = sources.slice(i, i + 5);
      const results = await Promise.all(batch.map(async (source) => {
        const isValid = await verifyFeed(source);
        return { source, isValid };
      }));

      for (const result of results) {
        total++;
        if (result.isValid) {
          successful++;
          verifiedSources[category].push(result.source);
          console.log(`[OK] ${result.source.name}`);
        }
      }
    }
  }

  console.log(`\nVerification Complete! ${successful}/${total} feeds working.`);

  // Generate the new file content
  const fileContent = `// Auto-generated verified list
export type RSSSource = {
  url: string;
  name: string;
  quality: number;
  warning?: string;
};

export const VERIFIED_RSS_SOURCES: Record<string, RSSSource[]> = ${JSON.stringify(verifiedSources, null, 2)};
`;

  const outputPath = path.join(process.cwd(), "server", "lib", "verified-publishers.ts");
  await fs.writeFile(outputPath, fileContent, "utf-8");
  console.log(`Verified list written to ${outputPath}`);
}

run().catch(console.error);
