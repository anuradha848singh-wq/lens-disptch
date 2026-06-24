import "dotenv/config";
import { fetchRealNews } from './server/news-fetcher';
import { storage } from './server/storage';
import { updateClusterAnalytics } from './server/processing';

(async () => {
    console.log("==================================================");
    console.log("   THE LENS DISPATCH — PIPELINE VERIFICATION");
    console.log("==================================================");
    
    try {
        console.log("\n[1/4] Starting Full Bias-Tier Fetch...");
        const count = await fetchRealNews();
        console.log(`Fetched and filtered ${count} articles.`);
        
        console.log("\n[2/4] Running Deep Cluster Analytics...");
        const allClusters = await storage.listClusters();
        console.log(`Analyzing ${allClusters.length} clusters for trending and diversity slots...`);
        
        for (const c of allClusters) {
            await updateClusterAnalytics(c.id);
        }

        console.log("\n[3/4] Fetching Curated Homepage Slots...");
        const slots = await storage.getHomepageSlots();
        
        console.log("\n--- BREAKING ---");
        slots.breaking.forEach((c: any) => console.log(`[Trend: ${c.trendingScore}] ${c.headline} (${c.articles.length} sources)`));
        
        console.log("\n--- TOP STORIES ---");
        slots.top_stories.forEach((c: any) => console.log(`[Imp: ${c.importanceScore}] ${c.headline} (${c.articles.length} sources)`));
        
        console.log("\n--- BLINDSPOTS ---");
        slots.blindspots.forEach((c: any) => {
            console.log(`[Blindspot: ${c.blindspotSide}] ${c.headline}`);
            const tiers = [...new Set(c.articles.map((a: any) => a.publisher?.biasRating))];
            console.log(`  Tiers present: ${tiers.join(", ")}`);
        });

        console.log("\n[4/4] Pipeline Verification Complete.");
        console.log("==================================================");

    } catch (e) {
        console.error("\n[!] Pipeline Verification Failed:", e);
    }
    process.exit(0);
})();
