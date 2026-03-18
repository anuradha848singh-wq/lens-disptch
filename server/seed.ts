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

    const { user: editor4 } = await storage.createUser(
      { email: "james@newshub.com", passwordHash: editorPassword, role: "editor", status: "active" },
      { userId: "", displayName: "James Thompson", avatarUrl: null, bio: "Foreign Policy Analyst" }
    );

    // Publishers — left, center, right mix
    const pubCNN = await storage.createPublisher({
      name: "Progressive Post",
      slug: "progressive-post",
      description: "Progressive news and opinion from a center-left perspective",
      logoUrl: null,
      website: "https://progressivepost.example.com",
      biasRating: "left",
    });

    const pubAP = await storage.createPublisher({
      name: "Associated Press",
      slug: "associated-press",
      description: "Breaking news and authoritative reporting from around the globe",
      logoUrl: null,
      website: "https://ap.example.com",
      biasRating: "center",
    });

    const pubFox = await storage.createPublisher({
      name: "Liberty Tribune",
      slug: "liberty-tribune",
      description: "Conservative news and commentary on American values",
      logoUrl: null,
      website: "https://libertytribune.example.com",
      biasRating: "right",
    });

    const pubWaPo = await storage.createPublisher({
      name: "National Review",
      slug: "national-review",
      description: "Center-right analysis and commentary on current events",
      logoUrl: null,
      website: "https://nationalreview.example.com",
      biasRating: "right",
    });

    const pubNPR = await storage.createPublisher({
      name: "Public Radio News",
      slug: "public-radio-news",
      description: "In-depth journalism and analysis serving the public interest",
      logoUrl: null,
      website: "https://prn.example.com",
      biasRating: "center",
    });

    const pubGuardian = await storage.createPublisher({
      name: "The Veritas",
      slug: "the-veritas",
      description: "Independent left-leaning journalism covering global affairs",
      logoUrl: null,
      website: "https://theveritas.example.com",
      biasRating: "left",
    });

    const categories = await storage.listCategories();
    const catMap: Record<string, any> = {};
    categories.forEach((c: any) => { catMap[c.slug] = c; });

    // Create tags
    const tags: Record<string, any> = {};
    for (const [name, slug] of [
      ["Economy", "economy"], ["Stock Market", "stock-market"], ["AI", "ai"],
      ["Healthcare", "healthcare"], ["Climate", "climate"], ["Immigration", "immigration"],
      ["Election", "election"], ["Tax Policy", "tax-policy"], ["Foreign Policy", "foreign-policy"],
      ["Inflation", "inflation"], ["Defense", "defense"], ["Free Speech", "free-speech"],
      ["Tech Regulation", "tech-regulation"], ["Energy", "energy"], ["Social Policy", "social-policy"],
    ]) {
      tags[slug as string] = await storage.createTag({ name: name as string, slug: slug as string });
    }

    const articles = [
      // LEFT bias articles
      {
        title: "New Study Links Fossil Fuel Subsidies to Accelerating Climate Breakdown",
        slug: "fossil-fuel-subsidies-climate-breakdown",
        excerpt: "Researchers find that government subsidies to fossil fuel industries are significantly slowing the transition to renewable energy and worsening global warming.",
        bodyHtml: `<p>A landmark study published in <em>Nature Climate Change</em> has found that government subsidies to fossil fuel industries are directly responsible for delaying the global transition to clean energy by an estimated decade.</p>
<p>The research, which analyzed data from 67 countries over 20 years, found that nations with the highest fossil fuel subsidies showed the slowest adoption of renewable energy technologies and the highest per-capita carbon emissions.</p>
<p>"We are essentially paying to accelerate our own climate crisis," said Dr. Aisha Patel, the study's lead author. "Every dollar spent subsidizing oil and gas is a dollar not invested in the technologies we need to survive as a civilization."</p>
<p>The findings come as world leaders prepare for the upcoming UN Climate Conference, where activists are pushing for a binding agreement to phase out all fossil fuel subsidies by 2030.</p>
<p>Critics of the current system argue that the $5.9 trillion in annual global fossil fuel subsidies — when accounting for unpriced externalities — represents the greatest market failure in human history.</p>`,
        heroImageUrl: null,
        publisherId: pubCNN.id,
        authorId: editor3.id,
        bias: "left" as const,
        categoryIds: [catMap["world"]?.id, catMap["politics"]?.id].filter(Boolean),
        tagIds: [tags["climate"]?.id, tags["energy"]?.id].filter(Boolean),
      },
      {
        title: "Universal Healthcare Coverage Could Save 68,000 Lives Per Year, Analysis Shows",
        slug: "universal-healthcare-lives-saved",
        excerpt: "A new analysis by health economists suggests expanding public health insurance to cover all Americans would dramatically reduce preventable deaths.",
        bodyHtml: `<p>A comprehensive analysis released by the Economic Policy Institute suggests that a universal healthcare system in the United States could prevent an estimated 68,000 deaths per year that currently occur due to lack of insurance coverage.</p>
<p>The study examined mortality data from states with higher rates of uninsured residents and compared health outcomes with countries that have universal coverage systems. The findings paint a stark picture of the human cost of America's fragmented healthcare system.</p>
<p>"These are not just statistics," said co-author Dr. Marcus Williams. "These are parents who can't afford cancer screenings, workers who skip medications because of cost, children who don't receive necessary vaccinations."</p>
<p>The analysis comes as Congress debates legislation that would expand Medicaid eligibility and increase subsidies for private insurance coverage.</p>`,
        heroImageUrl: null,
        publisherId: pubGuardian.id,
        authorId: editor1.id,
        bias: "left" as const,
        categoryIds: [catMap["health"]?.id, catMap["politics"]?.id].filter(Boolean),
        tagIds: [tags["healthcare"]?.id, tags["social-policy"]?.id].filter(Boolean),
      },
      {
        title: "Tech Giants Face Historic Antitrust Crackdown as Congress Acts",
        slug: "tech-giants-antitrust-congress",
        excerpt: "Bipartisan coalition pushes landmark legislation that would force major technology companies to divest key subsidiaries and open up to competition.",
        bodyHtml: `<p>A bipartisan coalition in Congress is pushing forward with what legal experts are calling the most significant antitrust legislation since the breakup of AT&T in the 1980s.</p>
<p>The proposed American Innovation and Choice Online Act would prohibit dominant technology platforms from giving preferential treatment to their own products and services, fundamentally reshaping how companies like Google, Amazon, and Apple operate.</p>
<p>Supporters argue the legislation is long overdue. "These companies have used their market dominance to crush competition and extract enormous rents from American consumers and businesses," said Rep. Anna Espinoza, one of the bill's co-sponsors.</p>`,
        heroImageUrl: null,
        publisherId: pubCNN.id,
        authorId: editor2.id,
        bias: "left" as const,
        categoryIds: [catMap["technology"]?.id, catMap["business"]?.id].filter(Boolean),
        tagIds: [tags["tech-regulation"]?.id].filter(Boolean),
      },

      // CENTER bias articles
      {
        title: "Federal Reserve Holds Rates Steady Amid Mixed Economic Signals",
        slug: "federal-reserve-rates-mixed-signals",
        excerpt: "The Fed maintains its wait-and-see approach as inflation cools but labor market shows unexpected resilience, leaving analysts divided on next moves.",
        bodyHtml: `<p>The Federal Reserve voted unanimously Wednesday to hold interest rates steady at their current target range, citing mixed signals from an economy showing both progress on inflation and unexpected resilience in employment.</p>
<p>Fed Chair Jerome Powell acknowledged the difficulty of the current moment. "We are seeing inflation continue to move toward our 2% target, but the pace has been uneven," he said at a post-meeting press conference. "The labor market remains stronger than many expected, which gives us room to proceed carefully."</p>
<p>The decision was widely anticipated by markets, though futures traders are now pricing in a lower probability of rate cuts this year than they were at the start of the quarter.</p>
<p>Economists are divided on what comes next. Some argue that the Fed has done enough and should begin easing policy, while others warn that inflation remains too persistent to justify cuts.</p>
<p>"We're in genuinely uncertain territory," said Dr. Priya Sharma, chief economist at Beacon Financial. "The data is sending conflicting messages, and the Fed is right to be cautious."</p>`,
        heroImageUrl: null,
        publisherId: pubAP.id,
        authorId: editor1.id,
        bias: "center" as const,
        categoryIds: [catMap["business"]?.id].filter(Boolean),
        tagIds: [tags["economy"]?.id, tags["inflation"]?.id].filter(Boolean),
      },
      {
        title: "Global Leaders Reach Compromise on AI Governance Framework",
        slug: "global-ai-governance-framework",
        excerpt: "After months of negotiations, representatives from 40 nations agree on baseline principles for regulating artificial intelligence, though key details remain unresolved.",
        bodyHtml: `<p>Representatives from 40 nations signed a landmark agreement Wednesday establishing a baseline framework for international cooperation on artificial intelligence governance, though the agreement leaves many of the thorniest regulatory questions for future negotiations.</p>
<p>The "Seoul Accords on AI" commit signatories to transparency requirements for high-risk AI systems, information sharing about AI-related incidents, and coordination on standards for AI safety evaluation.</p>
<p>"This is an historic first step," said UN Secretary-General María Esperanza at the signing ceremony. "We have agreed that AI development must be guided by shared values: safety, transparency, and respect for human rights."</p>
<p>However, critics from both industry groups and civil society organizations say the framework lacks enforcement mechanisms and leaves too much discretion to individual nations.</p>`,
        heroImageUrl: null,
        publisherId: pubNPR.id,
        authorId: editor2.id,
        bias: "center" as const,
        categoryIds: [catMap["technology"]?.id, catMap["world"]?.id].filter(Boolean),
        tagIds: [tags["ai"]?.id, tags["foreign-policy"]?.id].filter(Boolean),
      },
      {
        title: "Scientists Confirm New Antibiotic Class Effective Against Drug-Resistant Infections",
        slug: "new-antibiotic-drug-resistant-infections",
        excerpt: "Researchers announce breakthrough discovery of a novel class of antibiotics that successfully treats infections that have been resistant to all existing drugs.",
        bodyHtml: `<p>Scientists at the Broad Institute announced a major breakthrough Thursday: the discovery of a new class of antibiotics that successfully treats bacterial infections resistant to all currently available drugs.</p>
<p>The compounds, derived from a previously unstudied soil bacterium, work by attacking a cellular mechanism that has not been targeted by any existing antibiotic, making cross-resistance highly unlikely.</p>
<p>In laboratory tests and animal models, the new antibiotics demonstrated effectiveness against MRSA, drug-resistant tuberculosis, and other dangerous pathogens that kill hundreds of thousands of people annually despite intensive treatment.</p>
<p>"This could be the most important antibiotic discovery in decades," said Dr. Elizabeth Warrington, the study's senior author. "We have been running out of options for treating the most dangerous infections. This opens a new front."</p>`,
        heroImageUrl: null,
        publisherId: pubAP.id,
        authorId: editor1.id,
        bias: "center" as const,
        categoryIds: [catMap["health"]?.id].filter(Boolean),
        tagIds: [tags["healthcare"]?.id].filter(Boolean),
      },

      // RIGHT bias articles
      {
        title: "Biden-Era Regulations Cost American Businesses $1.9 Trillion, Study Finds",
        slug: "biden-regulations-cost-businesses",
        excerpt: "New research from the Competitive Enterprise Institute calculates the cumulative burden of recent federal regulations on small and large businesses alike.",
        bodyHtml: `<p>A new study from the Competitive Enterprise Institute has calculated that regulations implemented during the Biden administration added $1.9 trillion in costs to American businesses, raising concerns about the impact on economic growth and job creation.</p>
<p>The research, which analyzed 1,200 major regulatory actions from 2021 through 2024, found that energy, financial, and manufacturing sectors bore the heaviest burdens.</p>
<p>"American businesses — especially small businesses — are drowning in regulatory red tape," said study author Wayne Crews. "Every new regulation is a tax on productive activity, and the cumulative effect is strangling the entrepreneurial spirit that built this country."</p>
<p>Small business owners surveyed for the study reported spending an average of 80 hours per year on regulatory compliance, time that could otherwise be spent on serving customers and growing their enterprises.</p>
<p>Supporters of the regulatory framework counter that the rules protect workers, consumers, and the environment in ways that create long-term economic value that cost-benefit analyses fail to capture.</p>`,
        heroImageUrl: null,
        publisherId: pubFox.id,
        authorId: editor4.id,
        bias: "right" as const,
        categoryIds: [catMap["business"]?.id, catMap["politics"]?.id].filter(Boolean),
        tagIds: [tags["economy"]?.id, tags["tax-policy"]?.id].filter(Boolean),
      },
      {
        title: "Border Security Crisis Demands Immediate Congressional Action",
        slug: "border-security-congressional-action",
        excerpt: "Record-breaking migrant encounters in recent months highlight urgent need for comprehensive immigration reform that prioritizes national security.",
        bodyHtml: `<p>With migrant encounters at the southern border reaching historic levels for the third consecutive month, Republican lawmakers are intensifying calls for emergency legislation to restore order and enforce immigration laws.</p>
<p>The numbers tell a stark story: U.S. Customs and Border Protection reported over 200,000 encounters last month, straining federal resources and overwhelming border communities that have borne the brunt of the surge.</p>
<p>"The administration has abandoned the rule of law at our border," said Sen. Rick Cortez, a member of the Senate Judiciary Committee. "American communities are suffering real consequences — increased strain on public services, housing pressures, and public safety concerns."</p>
<p>Proponents of stricter enforcement policies argue that clear, consistently enforced immigration laws are not only legally required but serve as the most humane deterrent to dangerous crossings orchestrated by criminal smuggling networks.</p>`,
        heroImageUrl: null,
        publisherId: pubFox.id,
        authorId: editor4.id,
        bias: "right" as const,
        categoryIds: [catMap["politics"]?.id, catMap["world"]?.id].filter(Boolean),
        tagIds: [tags["immigration"]?.id].filter(Boolean),
      },
      {
        title: "Second Amendment Rights Under Threat as New Proposals Advance",
        slug: "second-amendment-new-proposals",
        excerpt: "Gun rights advocates warn that a new set of state-level firearm regulations represent unprecedented infringement on constitutional protections.",
        bodyHtml: `<p>A series of state-level legislative initiatives that gun rights advocates are calling an unprecedented assault on Second Amendment protections advanced through committee hearings across several states this week.</p>
<p>The proposals include expanded background check requirements, assault weapons restrictions, and a new licensing regime that critics say imposes unconstitutional burdens on law-abiding citizens seeking to exercise their constitutional rights.</p>
<p>"These laws don't target criminals — criminals don't follow gun laws," said Thomas Whitfield of the National Firearms Freedom Alliance. "These measures burden only law-abiding gun owners while doing nothing to reduce violent crime."</p>
<p>Statistical research on the effectiveness of gun regulations shows mixed results, with some studies finding modest reductions in certain types of gun violence while others show minimal impact on overall rates.</p>`,
        heroImageUrl: null,
        publisherId: pubWaPo.id,
        authorId: editor4.id,
        bias: "right" as const,
        categoryIds: [catMap["politics"]?.id].filter(Boolean),
        tagIds: [tags["free-speech"]?.id, tags["social-policy"]?.id].filter(Boolean),
      },
      {
        title: "Defense Spending Increases Essential as Global Threats Multiply",
        slug: "defense-spending-global-threats",
        excerpt: "Military analysts warn that cuts to defense budgets during the past decade have left the United States dangerously unprepared for the current threat environment.",
        bodyHtml: `<p>As conflict zones multiply across Europe, the Middle East, and the Indo-Pacific, defense analysts are warning that a decade of constrained military spending has left the United States and its allies dangerously unprepared for the current threat environment.</p>
<p>The latest assessment from the Heritage Foundation's defense policy team found that the U.S. military's readiness rating has declined significantly, with critical shortfalls in munitions stockpiles, shipbuilding capacity, and the size of the active-duty force.</p>
<p>"Our adversaries have been watching and investing," said retired Gen. Howard MacAllister. "China has essentially completed a military modernization program that would have seemed impossible 20 years ago. Russia, despite its setbacks in Ukraine, continues to invest in advanced weapons systems. We cannot afford complacency."</p>`,
        heroImageUrl: null,
        publisherId: pubWaPo.id,
        authorId: editor4.id,
        bias: "right" as const,
        categoryIds: [catMap["politics"]?.id, catMap["world"]?.id].filter(Boolean),
        tagIds: [tags["defense"]?.id, tags["foreign-policy"]?.id].filter(Boolean),
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
