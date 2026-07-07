import { storage } from "../storage";

async function main() {
  try {
    const homepageData = await storage.getHomepageClusters(50, 0, null, "all", "GLOBAL");
    console.log("Returned count:", homepageData.length);
    console.log("Categories of returned articles:");
    const categories = homepageData.map(a => ({
      title: a.title,
      categoryId: a.categoryId,
      categoryName: a.categories?.[0]?.name || "None"
    }));
    console.log(categories);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

main();
