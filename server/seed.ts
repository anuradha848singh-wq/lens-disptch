import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  try {
    const publishers = await storage.listPublishers();
    if (publishers.length > 0) {
      console.log("Database already seeded");
      return;
    }

    console.log("Seeding database...");

    const adminPassword = await hashPassword("admin123");
    const editorPassword = await hashPassword("editor123");

    const { user: admin } = await storage.createUser(
      { email: "admin@newshub.com", passwordHash: adminPassword, role: "admin", status: "active" },
      { userId: "", displayName: "Admin User", avatarUrl: null, bio: "Platform Administrator" }
    );

    const { user: editor1 } = await storage.createUser(
      { email: "sarah@newshub.com", passwordHash: editorPassword, role: "editor", status: "active" },
      { userId: "", displayName: "Sarah Johnson", avatarUrl: null, bio: "Business & Economics Reporter" }
    );

    const { user: editor2 } = await storage.createUser(
      { email: "michael@newshub.com", passwordHash: editorPassword, role: "editor", status: "active" },
      { userId: "", displayName: "Michael Chen", avatarUrl: null, bio: "Technology Correspondent" }
    );

    const { user: editor3 } = await storage.createUser(
      { email: "emma@newshub.com", passwordHash: editorPassword, role: "editor", status: "active" },
      { userId: "", displayName: "Emma Rodriguez", avatarUrl: null, bio: "Political Affairs Editor" }
    );

    const publisher1 = await storage.createPublisher({
      name: "Global Times",
      slug: "global-times",
      description: "International news and analysis from around the world",
      logoUrl: "/api/placeholder/200/200",
      website: "https://globaltimes.example.com",
      biasRating: "center",
    });

    const publisher2 = await storage.createPublisher({
      name: "Tech Daily",
      slug: "tech-daily",
      description: "Latest technology news, innovation, and digital trends",
      logoUrl: "/api/placeholder/200/200",
      website: "https://techdaily.example.com",
      biasRating: "left",
    });

    const publisher3 = await storage.createPublisher({
      name: "World Report",
      slug: "world-report",
      description: "Comprehensive global news coverage and investigative journalism",
      logoUrl: "/api/placeholder/200/200",
      website: "https://worldreport.example.com",
      biasRating: "center",
    });

    const categories = await storage.listCategories();
    const [politics, business, technology, sports, world, health] = categories;

    const economyTag = await storage.createTag({ name: "Economy", slug: "economy" });
    const stockMarketTag = await storage.createTag({ name: "Stock Market", slug: "stock-market" });
    const aiTag = await storage.createTag({ name: "AI", slug: "ai" });
    const healthcareTag = await storage.createTag({ name: "Healthcare", slug: "healthcare" });
    const climateTag = await storage.createTag({ name: "Climate", slug: "climate" });

    const articles = [
      {
        title: "Global Markets Rally as Economic Indicators Show Strong Growth",
        slug: "global-markets-rally-economic-growth",
        excerpt: "Stock markets worldwide experience significant gains following positive employment data and manufacturing reports across major economies.",
        bodyHtml: "<p>Stock markets worldwide experienced significant gains following positive employment data...</p>",
        heroImageUrl: "/api/placeholder/1200/600",
        publisherId: publisher1.id,
        authorId: editor1.id,
        bias: "center" as const,
        categoryIds: [business.id],
        tagIds: [economyTag.id, stockMarketTag.id],
      },
      {
        title: "AI Breakthrough Promises Revolutionary Changes in Healthcare Diagnostics",
        slug: "ai-breakthrough-healthcare-diagnostics",
        excerpt: "New artificial intelligence system demonstrates unprecedented accuracy in early disease detection, potentially saving millions of lives.",
        bodyHtml: "<p>A revolutionary AI system has achieved breakthrough results in medical diagnostics...</p>",
        heroImageUrl: "/api/placeholder/1200/600",
        publisherId: publisher2.id,
        authorId: editor2.id,
        bias: "left" as const,
        categoryIds: [technology.id, health.id],
        tagIds: [aiTag.id, healthcareTag.id],
      },
      {
        title: "Political Leaders Gather for Historic Climate Summit in Geneva",
        slug: "climate-summit-geneva",
        excerpt: "World leaders convene to discuss ambitious carbon reduction targets and sustainable energy transition strategies.",
        bodyHtml: "<p>World leaders from over 100 nations have gathered in Geneva for what many are calling...</p>",
        heroImageUrl: "/api/placeholder/1200/600",
        publisherId: publisher3.id,
        authorId: editor3.id,
        bias: "center" as const,
        categoryIds: [politics.id, world.id],
        tagIds: [climateTag.id],
      },
      {
        title: "Championship Finals Draw Record Viewership Across Multiple Platforms",
        slug: "championship-finals-record-viewership",
        excerpt: "Historic sporting event breaks streaming records as millions tune in globally for thrilling finale.",
        bodyHtml: "<p>The championship finals shattered all previous viewership records...</p>",
        heroImageUrl: "/api/placeholder/1200/600",
        publisherId: publisher1.id,
        authorId: editor1.id,
        bias: "center" as const,
        categoryIds: [sports.id],
        tagIds: [],
      },
      {
        title: "Cybersecurity Threats Escalate as Companies Face Sophisticated Attacks",
        slug: "cybersecurity-threats-escalate",
        excerpt: "Major corporations report increased frequency and sophistication of cyber attacks, prompting urgent security overhauls.",
        bodyHtml: "<p>Cybersecurity experts warn of a dramatic increase in sophisticated attacks...</p>",
        heroImageUrl: "/api/placeholder/1200/600",
        publisherId: publisher2.id,
        authorId: editor2.id,
        bias: "left" as const,
        categoryIds: [technology.id, business.id],
        tagIds: [],
      },
    ];

    for (const articleData of articles) {
      const { categoryIds, tagIds, ...data } = articleData;
      const article = await storage.createArticle(data, categoryIds, tagIds);
      await storage.publishArticle(article.id);
    }

    console.log("Database seeded successfully!");
    console.log("Admin: admin@newshub.com / admin123");
    console.log("Editor: sarah@newshub.com / editor123");
  } catch (error) {
    console.error("Seeding error:", error);
  }
}
