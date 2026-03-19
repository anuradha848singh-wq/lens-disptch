import { fetchRealNews } from './server/news-fetcher';
import { storage } from './server/storage';

(async () => {
    console.log("Initializing storage...");
    
    // Ensure system user exists for MemStorage
    let systemUser = await storage.getUserByEmail("system@newshub.com");
    if (!systemUser) {
        await storage.createUser(
            { email: "system@newshub.com", passwordHash: "dummy", role: "editor", status: "active" },
            { userId: "", displayName: "News Bot", avatarUrl: null, bio: "" }
        );
    }

    // Ensure categories exist
    const categories = await storage.listCategories();
    if (categories.length === 0) {
        const defaultCats = ["world", "politics", "business", "technology", "entertainment", "sports", "science", "health"];
        for (const name of defaultCats) {
            await storage.createCategory({ name, slug: name.toLowerCase(), description: "" });
        }
    }

    console.log("Starting fetch...");
    try {
        const count = await fetchRealNews();
        console.log("Fetched count:", count);
        
        console.log("Analyzing clusters...");
        
        // Build publisher map
        const allPubs = await storage.listPublishers();
        const publishersMap: Record<string, string> = {};
        allPubs.forEach(p => publishersMap[p.id] = p.name);

        // Access internal storage map (hack for test script)
        // @ts-ignore
        const allArticles = Array.from(storage.articles.values());
        const groupsMap: Record<string, {title: string, pub: string}[]> = {};

        allArticles.forEach(a => {
            const cid = a.clusterId || "standalone-" + a.id;
            if (!groupsMap[cid]) groupsMap[cid] = [];
            groupsMap[cid].push({ title: a.title, pub: publishersMap[a.publisherId] || 'Unknown' });
        });
        
        let clustersFound = 0;
        let totalClusteredArticles = 0;
        
        Object.entries(groupsMap).forEach(([cid, arts]) => {
            if (arts.length > 1) {
                clustersFound++;
                totalClusteredArticles += arts.length;
                console.log(`\n[Cluster] ${cid} (${arts.length} sources):`);
                arts.forEach(item => console.log(`  - [${item.pub}] ${item.title}`));
            }
        });
        
        console.log(`\n================================`);
        console.log(`Total Clusters Found: ${clustersFound}`);
        console.log(`Total Articles in DB: ${allArticles.length}`);
        console.log(`Average Sources per Cluster: ${clustersFound > 0 ? (totalClusteredArticles / clustersFound).toFixed(2) : 0}`);
        console.log(`================================\n`);
        
    } catch (e) {
        console.error("Critical Analysis Error:", e);
    }
    process.exit(0);
})();
