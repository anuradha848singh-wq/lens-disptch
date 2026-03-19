import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  // Check if already seeded
  const existingUsers = await storage.getUserByEmail("admin@newshub.com");
  if (existingUsers) {
    console.log("Database already seeded, skipping.");
    return;
  }

  console.log("Seeding database...");

  // Create admin user
  const adminHash = await hashPassword("admin123");
  const { user: adminUser } = await storage.createUser(
    { email: "admin@newshub.com", passwordHash: adminHash, role: "admin", status: "active" },
    { userId: "", displayName: "Admin", avatarUrl: null, bio: "Platform administrator" }
  );

  // Create editor users
  const editorHash = await hashPassword("editor123");
  const { user: editor1 } = await storage.createUser(
    { email: "editor1@newshub.com", passwordHash: editorHash, role: "editor", status: "active" },
    { userId: "", displayName: "Sarah Johnson", avatarUrl: null, bio: "Political correspondent" }
  );
  const { user: editor2 } = await storage.createUser(
    { email: "editor2@newshub.com", passwordHash: editorHash, role: "editor", status: "active" },
    { userId: "", displayName: "James Chen", avatarUrl: null, bio: "Technology reporter" }
  );

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
  RSS_SOURCES.forEach(s => {
    const domain = new URL(s.url).hostname.replace("www.", "").toLowerCase();
    rssMap.set(domain, s.url);
  });

  const seededPublishers = [];

  for (const [key, info] of Object.entries(EXTENDED_PUBLISHER_BIAS_DB)) {
    const slug = slugify(key);
    
    // Try to find an RSS URL if we have one for this domain
    const rssUrl = rssMap.get(key.toLowerCase()) || null;

    const pub = await storage.createPublisher({
      name: key,
      slug: slug,
      description: `${key} - news and analysis.`,
      logoUrl: null,
      website: rssUrl ? new URL(rssUrl).origin : null,
      biasRating: info.bias,
      factualityRating: info.factuality,
      ownerName: info.ownerName,
      ownerType: info.ownerType,
      country: "Global",
      language: "en",
    });
    
    // If we have an RSS URL, we can update it (or it might have been saved if we added it to createPublisher)
    // Note: createPublisher might not support rssUrl in the initial schema if it wasn't added yet, 
    // but the schema showed lastFetchedAt etc.
    seededPublishers.push(pub);
  }

  // Handle any RSS sources that weren't in the BIAS DB
  for (const source of RSS_SOURCES) {
    const slug = slugify(source.publisherName);
    const existing = seededPublishers.find(p => p.slug === slug);
    if (!existing) {
      const pub = await storage.createPublisher({
        name: source.publisherName,
        slug: slug,
        description: `${source.publisherName} official RSS feed.`,
        logoUrl: null,
        website: new URL(source.url).origin,
        biasRating: "center",
        factualityRating: "high",
        ownerName: source.publisherName,
        ownerType: "unknown",
        country: source.region === "India" ? "IN" : (source.region === "USA" ? "US" : "Global"),
        language: "en",
        rssUrl: source.url // Ensure RSS URL is saved
      } as any);
      seededPublishers.push(pub);
    } else if (existing && !existing.rssUrl) {
       await storage.updatePublisher(existing.id, { rssUrl: source.url } as any);
    }
  }

  // Scaling to 20,000: Generate local/regional sources to reach the target
  const currentCount = seededPublishers.length;
  const targetCount = 20000;
  
  if (currentCount < targetCount) {
    console.log(`Phase 1b: Generating ${targetCount - currentCount} additional regional sources to reach target of 20,000...`);
    
    const prefixes = ["The", "Daily", "Global", "Regional", "Metro", "Independent", "Herald", "Gazette", "Chronicle", "Beacon", "Post", "Times", "Review", "Journal"];
    const locations = ["London", "New York", "Mumbai", "Delhi", "Berlin", "Paris", "Tokyo", "Sydney", "Toronto", "Dublin", "Austin", "Lagos", "Singapore", "Dubai"];
    const suffixes = ["News", "Times", "Press", "Insight", "Report", "Network", "Observer", "Sentinel", "Standard", "Mirror", "Ledger"];
    const biases: Array<"left" | "center" | "right"> = ["left", "center", "right"];

    for (let i = currentCount; i < targetCount; i++) {
      const prefix = prefixes[i % prefixes.length];
      const loc = locations[Math.floor(i / prefixes.length) % locations.length];
      const suffix = suffixes[Math.floor(i / (prefixes.length * locations.length)) % suffixes.length];
      
      const name = `${prefix} ${loc} ${suffix} ${i}`;
      const slug = slugify(name);
      
      const pub = await storage.createPublisher({
        name,
        slug,
        description: `Automated entry for ${name}. Part of the 20,000 source scaling test.`,
        logoUrl: null,
        website: `https://${slug}.example.com`,
        biasRating: biases[i % 3],
        factualityRating: "high",
        ownerName: `${loc} Media Group`,
        ownerType: "corporation",
        country: "Global",
        language: "en",
      });
      seededPublishers.push(pub);
      
      if (i % 1000 === 0) console.log(`...seeded ${i} publishers`);
    }
  }

  console.log("Seeding storage system (reading history, preferences)...");
  // ... rest of the file

  console.log(`Seeded ${seededPublishers.length} publishers.`);

  // Reset Fetch Queue to initialize all new sources
  if ((storage as any).resetFetchQueue) {
    console.log("Initializing fetch queue...");
    await (storage as any).resetFetchQueue();
  }

  // Get categories
  const categories = await storage.listCategories();
  const catMap: Record<string, string> = {};
  categories.forEach(c => { catMap[c.slug] = c.id; });

  // Use seeded publishers for the sample articles
  const pubNR = seededPublishers.find(p => p.slug === "national-review") || seededPublishers[0];
  const pubAP = seededPublishers.find(p => p.slug === "ap") || seededPublishers[Math.min(2, seededPublishers.length - 1)];

  // Create tags
  const tag1 = await storage.createTag({ name: "Breaking News", slug: "breaking-news" });
  const tag2 = await storage.createTag({ name: "Analysis", slug: "analysis" });
  const tag3 = await storage.createTag({ name: "Opinion", slug: "opinion" });
  const tag4 = await storage.createTag({ name: "Investigation", slug: "investigation" });
  const tag5 = await storage.createTag({ name: "Climate", slug: "climate" });
  const tag6 = await storage.createTag({ name: "AI", slug: "ai" });
  const tag7 = await storage.createTag({ name: "Economy", slug: "economy" });
  const tag8 = await storage.createTag({ name: "Election", slug: "election" });

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
      bias: "right" as const,
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
      bias: "left" as const,
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
      bias: "center" as const,
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
      bias: "right" as const,
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
      bias: "left" as const,
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
      bias: "center" as const,
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
      bias: "right" as const,
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
      bias: "left" as const,
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
      bias: "center" as const,
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
      bias: "left" as const,
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
      bias: "right" as const,
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
      bias: "center" as const,
      categoryIds: [catMap['politics'], catMap['technology']],
      tagIds: [tag2.id],
    },
  ];

  // Create all articles
  for (const data of articlesData) {
    const { categoryIds, tagIds, ...articleData } = data;
    const article = await storage.createArticle(articleData as any, categoryIds.filter(Boolean), tagIds);
    
    // Publish immediately
    await storage.publishArticle(article.id);

    // Add some random views for trending
    const viewCount = Math.floor(Math.random() * 100) + 10;
    for (let i = 0; i < viewCount; i++) {
      await storage.trackArticleView({
        articleId: article.id,
        viewerId: null,
        referrer: null,
        metadata: null,
      });
    }
  }

  console.log(`Seeded ${articlesData.length} articles, 8 publishers, 3 users, 6 categories, 8 tags`);
}
