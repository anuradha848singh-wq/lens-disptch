import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  // Run Database GIN Index Search Migration if connection is present
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    console.log("Running Database GIN Index Search Migration...");
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_clusters_headline ON clusters USING gin(to_tsvector('english', headline));`);
      console.log("Database GIN Index Search Migration completed successfully.");
    } catch (err: any) {
      console.error("Failed to run GIN index migration:", err.message);
    }
  } else {
    console.log("Running in demo mode, skipping Database GIN Index Search Migration.");
  }

  // const existingUsers = await storage.getUserByEmail("admin@newshub.com");
  // if (existingUsers) {
  //   console.log("Database already seeded, skipping.");
  //   return;
  // }

  console.log("Seeding database...");

  // Create admin user
  const adminEmail = "admin@newshub.com";
  let adminUser = await storage.getUserByEmail(adminEmail);
  if (!adminUser) {
    const adminHash = await hashPassword("admin123");
    const result = await storage.createUser(
      { email: adminEmail, passwordHash: adminHash, role: "admin", status: "active" },
      { userId: "", displayName: "Admin", avatarUrl: null, bio: "Platform administrator" }
    );
    adminUser = result.user;
  }

  // Create editor users
  const editorHash = await hashPassword("editor123");
  
  let editor1 = await storage.getUserByEmail("editor1@newshub.com");
  if (!editor1) {
    const result = await storage.createUser(
      { email: "editor1@newshub.com", passwordHash: editorHash, role: "editor", status: "active" },
      { userId: "", displayName: "Sarah Johnson", avatarUrl: null, bio: "Political correspondent" }
    );
    editor1 = result.user;
  }

  let editor2 = await storage.getUserByEmail("editor2@newshub.com");
  if (!editor2) {
    const result = await storage.createUser(
      { email: "editor2@newshub.com", passwordHash: editorHash, role: "editor", status: "active" },
      { userId: "", displayName: "James Chen", avatarUrl: null, bio: "Technology reporter" }
    );
    editor2 = result.user;
  }

  // Massive scaling: Load publishers from Extended Bias DB and RSS Sources
  const { EXTENDED_PUBLISHER_BIAS_DB } = await import("./publisher-bias-db");
  const { RSS_SOURCES } = await import("./rss-sources");

  console.log(`Phase 1: Seeding ${Object.keys(EXTENDED_PUBLISHER_BIAS_DB).length} sources...`);

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 200);
  }

  // Map RSS URLs to publisher names for easy lookup
  const rssMap = new Map<string, string>();
  Object.values(RSS_SOURCES).flat().forEach(s => {
    const domain = new URL(s.url).hostname.replace("www.", "").toLowerCase();
    rssMap.set(domain, s.url);
  });

  const seededPublishers = [];

  for (const [key, info] of Object.entries(EXTENDED_PUBLISHER_BIAS_DB)) {
    const slug = slugify(key);
    
    // Try to find an RSS URL if we have one for this domain
    let rssUrl = rssMap.get(key.toLowerCase()) || null;

    let pub = await storage.getPublisherBySlug(slug);
    if (!pub) {
      pub = await storage.createPublisher({
        name: key,
        slug: slug,
        description: `${key} - news and analysis.`,
        logoUrl: null,
        website: rssUrl ? new URL(rssUrl).origin : null,
        biasRating: info.bias,
        factualityRating: info.factuality,
        reliabilityScore: info.factuality === "very_high" ? 95 : (info.factuality === "high" ? 85 : 70),
        ownerName: info.ownerName,
        ownerType: info.ownerType,
        rssUrl,
        country: "Global",
        language: "en",
        active: true,
      });
    }
    
    seededPublishers.push(pub);
  }

  // Handle any RSS sources that weren't in the BIAS DB
  for (const source of Object.values(RSS_SOURCES).flat()) {
    const slug = slugify(source.name);
    let pub = await storage.getPublisherBySlug(slug);
    if (!pub) {
      pub = await storage.createPublisher({
        name: source.name,
        slug: slug,
        description: `${source.name} official RSS feed.`,
        logoUrl: null,
        website: new URL(source.url).origin,
        biasRating: "neutral",
        factualityRating: "high",
        reliabilityScore: 80,
        ownerName: source.name,
        ownerType: "unknown",
        rssUrl: source.url,
        country: "Global",
        language: "en",
        active: true,
      });
    } else if (pub && !pub.rssUrl) {
       await storage.updatePublisher(pub.id, { rssUrl: source.url } as any);
    }
    
    if (!seededPublishers.find(p => p.slug === slug)) {
      seededPublishers.push(pub);
    }
  }

  // Phase 1b: Removed fake publisher generation. Only real bias data is used for quality.
  console.log("Phase 1b: Skipping fake source generation to maintain database quality.");

  console.log("Seeding storage system (reading history, preferences)...");
  // ... rest of the file

  console.log(`Seeded ${seededPublishers.length} publishers.`);

  // Reset Fetch Queue to initialize all new sources
  if ((storage as any).resetFetchQueue) {
    console.log("Initializing fetch queue...");
    await (storage as any).resetFetchQueue();
  }

  // Phase 2: Seed categories
  console.log("Phase 2: Seeding categories...");
  const standardCategories = [
    { name: "Politics", slug: "politics", description: "Government, elections, and policy." },
    { name: "Technology", slug: "technology", description: "AI, software, and gadgets." },
    { name: "Business", slug: "business", description: "Economy, markets, and finance." },
    { name: "Health", slug: "health", description: "Medical research, wellness, and policy." },
    { name: "Sports", slug: "sports", description: "Games, leagues, and athletes." },
    { name: "World", slug: "world", description: "International news and global events." },
    { name: "Entertainment", slug: "entertainment", description: "Movies, music, and celebrity news." },
  ];

  for (const cat of standardCategories) {
    const existing = await storage.getCategoryBySlug(cat.slug);
    if (!existing) {
      await storage.createCategory(cat);
    }
  }

  // Get categories
  const categories = await storage.listCategories();

  const catMap: Record<string, string> = {};
  categories.forEach((c: any) => { catMap[c.slug] = c.id; });

  // Use seeded publishers for the sample articles
  const pubNR = seededPublishers.find(p => p.slug === "national-review") || seededPublishers[0];
  const pubAP = seededPublishers.find(p => p.slug === "ap") || seededPublishers[Math.min(2, seededPublishers.length - 1)];

  // Create tags
  async function getOrCreateTag(name: string, slug: string) {
    const existing = await storage.getTagBySlug(slug);
    if (existing) return existing;
    return await storage.createTag({ name, slug });
  }

  const tag1 = await getOrCreateTag("Breaking News", "breaking-news");
  const tag2 = await getOrCreateTag("Analysis", "analysis");
  const tag3 = await getOrCreateTag("Opinion", "opinion");
  const tag4 = await getOrCreateTag("Investigation", "investigation");
  const tag5 = await getOrCreateTag("Climate", "climate");
  const tag6 = await getOrCreateTag("AI", "ai");
  const tag7 = await getOrCreateTag("Economy", "economy");
  const tag8 = await getOrCreateTag("Election", "election");

  // Create articles across different biases (for rich blindspot data)
  const articlesData = [
    {
      publisherId: pubNR.id,
      authorId: editor1.id,
      title: "Tax Reform Package Shows Strong Economic Growth Potential",
      slug: "tax-reform-economic-growth",
      excerpt: "New analysis shows the proposed tax reform could boost GDP by 2.5% over the next decade, creating millions of jobs and stimulating business investment.",
      bodyHtml: "<p>A comprehensive analysis of the proposed tax reform package reveals significant potential for economic growth...</p><p>The Penn Wharton Budget Model projects that the reforms could increase GDP by 2.5% over ten years, primarily through reduced corporate tax rates and expanded deductions for small businesses.</p><p>Critics argue the benefits disproportionately favor large corporations, but advocates point to projected job creation figures exceeding 3 million new positions.</p>",
      heroImageUrl: null,
      status: "published" as const,
      bias: "pro_establishment" as const,
      url: `https://${pubNR.slug}.com/tax-reform-economic-growth`,
      categoryIds: [catMap['politics'], catMap['business']],
      tagIds: [tag2.id, tag7.id],
    },
    {
      publisherId: pubAP.id,
      authorId: editor1.id,
      title: "Climate Action Plan Gains Bipartisan Support in New Poll",
      slug: "climate-action-bipartisan-support",
      excerpt: "A new nationwide poll shows 72% of voters support the comprehensive climate action plan, crossing traditional party lines.",
      bodyHtml: "<p>A groundbreaking new poll from Pew Research reveals unprecedented bipartisan support for climate action...</p><p>The survey of 10,000 voters found that 72% support a comprehensive approach to climate change that includes both renewable energy investment and market-based carbon pricing.</p><p>Even among conservative voters, support reached 54%, a sharp increase from just 31% in 2020.</p>",
      heroImageUrl: null,
      status: "published" as const,
      bias: "pro_opposition" as const,
      url: `https://${pubAP.slug}.com/climate-action-bipartisan-support`,
      categoryIds: [catMap['politics']],
      tagIds: [tag1.id, tag5.id],
    },
    {
      publisherId: pubAP.id,
      authorId: editor2.id,
      title: "AI Regulation Framework Proposed by International Coalition",
      slug: "ai-regulation-framework-proposal",
      excerpt: "A coalition of 27 nations has proposed a landmark framework for AI regulation, balancing innovation with safety concerns.",
      bodyHtml: "<p>In a historic agreement, representatives from 27 nations have unveiled a comprehensive framework for artificial intelligence regulation...</p><p>The proposed framework establishes three tiers of AI systems based on risk level, with corresponding requirements for testing, transparency, and accountability.</p><p>Tech industry leaders have expressed cautious support, noting that clear guidelines could actually accelerate responsible AI deployment.</p>",
      heroImageUrl: null,
      status: "published" as const,
      bias: "neutral" as const,
      url: `https://${pubAP.slug}.com/article-placeholder-url`,
      categoryIds: [catMap['technology'], catMap['world']],
      tagIds: [tag1.id, tag6.id],
    },
    {
      publisherId: pubNR.id,
      authorId: editor1.id,
      title: "Federal Reserve Signals Rate Stability Through Year End",
      slug: "fed-rate-stability-signal",
      excerpt: "Federal Reserve Chair signals intention to maintain current interest rates, citing balanced economic indicators.",
      bodyHtml: "<p>Federal Reserve Chair has indicated that interest rates are likely to remain stable through the end of the year...</p><p>In testimony before Congress, the Chair cited strong employment numbers but acknowledged persistent inflation concerns in the housing sector.</p><p>Market analysts largely anticipated the decision, with the S&P 500 rising modestly following the announcement.</p>",
      heroImageUrl: null,
      status: "published" as const,
      bias: "pro_establishment" as const,
      url: `https://${pubNR.slug}.com/fed-rate-stability-signal`,
      categoryIds: [catMap['business']],
      tagIds: [tag2.id, tag7.id],
    },
    {
      publisherId: pubAP.id,
      authorId: editor1.id,
      title: "Healthcare Access Gap Widens in Rural Communities",
      slug: "healthcare-access-gap-rural",
      excerpt: "New report reveals growing healthcare disparities as rural hospitals continue to close at alarming rates.",
      bodyHtml: "<p>A devastating new report from the Rural Health Policy Institute reveals that 136 rural hospitals have closed since 2010...</p><p>The closures have left an estimated 8 million Americans without access to emergency care within a 30-minute drive.</p><p>Advocates are calling for increased federal funding and innovative telemedicine solutions to bridge the gap.</p>",
      heroImageUrl: null,
      status: "published" as const,
      bias: "pro_opposition" as const,
      url: `https://${pubAP.slug}.com/article-placeholder-url`,
      categoryIds: [catMap['health'], catMap['politics']],
      tagIds: [tag4.id],
    },
    {
      publisherId: pubAP.id,
      authorId: editor2.id,
      title: "Global Supply Chain Recovery Reaches Pre-Pandemic Levels",
      slug: "supply-chain-recovery-pandemic",
      excerpt: "International trade data confirms that global supply chains have fully recovered, with shipping volumes exceeding 2019 levels.",
      bodyHtml: "<p>After years of disruption, global supply chains have officially returned to pre-pandemic performance levels...</p><p>The World Trade Organization reports that container shipping volumes are now 12% above 2019 levels, while average delivery times have dropped to within 5% of pre-COVID benchmarks.</p><p>Analysts note that the recovery has been uneven, with semiconductor supply still facing periodic shortages.</p>",
      heroImageUrl: null,
      status: "published" as const,
      bias: "neutral" as const,
      url: `https://${pubAP.slug}.com/article-placeholder-url`,
      categoryIds: [catMap['business'], catMap['world']],
      tagIds: [tag2.id],
    },
    {
      publisherId: pubNR.id,
      authorId: editor1.id,
      title: "Second Amendment Rights Victory in Supreme Court Ruling",
      slug: "second-amendment-supreme-court",
      excerpt: "Supreme Court upholds individual gun ownership rights in landmark 6-3 decision with broad implications.",
      bodyHtml: "<p>In a closely watched case, the Supreme Court has ruled 6-3 in favor of expanding Second Amendment protections...</p><p>The decision effectively strikes down several state-level restrictions on concealed carry permits, arguing they violate the constitutional right to bear arms.</p><p>Gun rights organizations celebrated the ruling, while gun control advocates vowed to pursue legislative alternatives.</p>",
      heroImageUrl: null,
      status: "published" as const,
      bias: "pro_establishment" as const,
      url: `https://${pubNR.slug}.com/second-amendment-supreme-court`,
      categoryIds: [catMap['politics']],
      tagIds: [tag1.id],
    },
    {
      publisherId: pubAP.id,
      authorId: editor2.id,
      title: "Wealth Inequality Accelerates as Top 1% Gains Record Share",
      slug: "wealth-inequality-accelerates",
      excerpt: "New Federal Reserve data shows the richest 1% now hold 32% of all wealth, the highest concentration since the Great Depression.",
      bodyHtml: "<p>Newly released Federal Reserve data paints a stark picture of growing wealth concentration in America...</p><p>The top 1% of households now control a record 32% of total household wealth, while the bottom 50% holds just 2.6%.</p><p>Progressive economists argue this trend threatens democratic stability and call for structural reforms to tax policy.</p>",
      heroImageUrl: null,
      status: "published" as const,
      bias: "pro_opposition" as const,
      url: `https://${pubAP.slug}.com/article-placeholder-url`,
      categoryIds: [catMap['business'], catMap['politics']],
      tagIds: [tag2.id, tag7.id],
    },
    {
      publisherId: pubAP.id,
      authorId: editor2.id,
      title: "International Space Station Crew Completes Historic Experiment",
      slug: "iss-crew-historic-experiment",
      excerpt: "The ISS crew successfully completes a zero-gravity pharmaceutical experiment that could revolutionize drug manufacturing.",
      bodyHtml: "<p>Astronauts aboard the International Space Station have completed a groundbreaking pharmaceutical experiment...</p><p>The experiment demonstrated that protein crystals grown in microgravity produce significantly purer drug compounds, potentially reducing manufacturing costs by up to 40%.</p><p>NASA and ESA scientists say the results could lead to more effective treatments for cancer and autoimmune diseases.</p>",
      heroImageUrl: null,
      status: "published" as const,
      bias: "neutral" as const,
      url: `https://${pubAP.slug}.com/article-placeholder-url`,
      categoryIds: [catMap['technology'], catMap['health']],
      tagIds: [tag1.id],
    },
    {
      publisherId: pubAP.id,
      authorId: editor1.id,
      title: "Workers Strike at Major Tech Companies for Better Conditions",
      slug: "tech-workers-strike-conditions",
      excerpt: "Thousands of workers at three major tech companies walk out demanding improved work conditions and pay transparency.",
      bodyHtml: "<p>In an unprecedented coordinated action, workers at three major technology companies staged walkouts...</p><p>The strikes, organized through cross-company labor networks, demand improved remote work policies, pay transparency, and protections against algorithmic management.</p><p>Labor experts say the tech industry's growing unionization trend signals a fundamental shift in Silicon Valley culture.</p>",
      heroImageUrl: null,
      status: "published" as const,
      bias: "pro_opposition" as const,
      url: `https://${pubAP.slug}.com/article-placeholder-url`,
      categoryIds: [catMap['technology'], catMap['business']],
      tagIds: [tag1.id],
    },
    {
      publisherId: pubNR.id,
      authorId: editor1.id,
      title: "Border Security Bill Passes Senate with Strong Majority",
      slug: "border-security-bill-passes",
      excerpt: "The comprehensive border security bill passes the Senate 68-32, including funding for technology and personnel.",
      bodyHtml: "<p>The Senate has passed a comprehensive border security bill with a strong bipartisan majority...</p><p>The legislation allocates $25 billion for border technology, additional personnel, and immigration court expansions.</p><p>Both parties claimed victory, with conservatives highlighting security measures and moderates pointing to pathway provisions.</p>",
      heroImageUrl: null,
      status: "published" as const,
      bias: "pro_establishment" as const,
      url: `https://${pubNR.slug}.com/border-security-bill-passes`,
      categoryIds: [catMap['politics']],
      tagIds: [tag1.id, tag8.id],
    },
    {
      publisherId: pubAP.id,
      authorId: editor2.id,
      title: "National Infrastructure Report Card: Progress and Challenges",
      slug: "national-infrastructure-report",
      excerpt: "Annual infrastructure assessment shows significant progress in transportation but continued challenges in water systems.",
      bodyHtml: "<p>The annual National Infrastructure Report Card shows mixed results for the nation's critical systems...</p><p>Transportation infrastructure earned a B- grade, up from C+ last year, thanks to increased federal investment. However, water and sewer systems remain at a D+, with an estimated $600 billion needed for modernization.</p><p>Engineers note that climate adaptation requirements have added new challenges to already aging systems.</p>",
      heroImageUrl: null,
      status: "published" as const,
      bias: "neutral" as const,
      url: `https://${pubAP.slug}.com/article-placeholder-url`,
      categoryIds: [catMap['politics'], catMap['technology']],
      tagIds: [tag2.id],
    },
  ];

  // Create all articles
  for (const data of articlesData) {
    const { categoryIds, tagIds, publisherId, ...articleData } = data;
    
    // Existence check to make seeding idempotent
    const existing = await storage.getArticleBySlug(articleData.slug);
    if (existing) {
      console.log(`Article already exists, skipping: ${articleData.slug}`);
      continue;
    }

    try {
      const article = await storage.createArticle({
        ...articleData,
        sourceId: publisherId,
      } as any, categoryIds.filter(Boolean), tagIds);
      await storage.publishArticle(article.id);
      const viewCount = Math.floor(Math.random() * 100) + 10;
      for (let i = 0; i < viewCount; i++) {
        await storage.trackArticleView({
          articleId: article.id,
          viewerId: null,
          metadata: null,
        });
      }
    } catch (e: any) {
      if (e.code === '23505') {
        console.log(`Article already exists (duplicate URL/Slug): ${articleData.slug}`);
      } else {
        throw e;
      }
    }

  }

  // Pre-populate logo URLs for top publishers using Clearbit
  // This runs once on first seed — subsequent starts skip existing logos
  const topPublisherDomains: Record<string, string> = {
    "bbc.com": "http://feeds.bbci.co.uk",
    "reuters.com": "reuters.com",
    "apnews.com": "apnews.com",
    "foxnews.com": "foxnews.com",
    "theguardian.com": "theguardian.com",
    "nytimes.com": "nytimes.com",
    "aljazeera.com": "aljazeera.com",
    "dw.com": "dw.com",
    "france24.com": "france24.com",
    "ft.com": "ft.com",
    "economist.com": "economist.com",
    "breitbart.com": "breitbart.com",
    "nationalreview.com": "nationalreview.com",
    "thehindu.com": "thehindu.com",
    "ndtv.com": "ndtv.com",
  };
  for (const [domain, _] of Object.entries(topPublisherDomains)) {
    const slug = domain.replace(/\./g, "-");
    try {
      const pub = await storage.getPublisherBySlug(slug) ||
        seededPublishers.find(p => p.slug?.includes(domain.split(".")[0]));
      if (pub && !pub.logoUrl) {
        await storage.updatePublisher(pub.id, {
          logoUrl: `https://logo.clearbit.com/${domain}`
        } as any);
      }
    } catch {}
  }

  console.log(`Seeded ${articlesData.length} articles, ${seededPublishers.length} publishers, 3 users, 6 categories, 8 tags`);
}

import { fileURLToPath } from "url";
const isMain = process.argv[1] && process.argv[1].endsWith("seed.ts");

if (isMain) {
  seedDatabase()
    .then(() => {
      console.log("Seeding complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}



