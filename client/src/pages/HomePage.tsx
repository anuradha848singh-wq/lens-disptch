import { useState } from "react";
import { BreakingNewsTicker } from "@/components/BreakingNewsTicker";
import { Header } from "@/components/Header";
import { CategoryPills } from "@/components/CategoryPills";
import { ArticleCard } from "@/components/ArticleCard";
import { BiasFilter } from "@/components/BiasFilter";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import businessHero from "@assets/generated_images/Business_news_hero_image_33ed114d.png";
import techHero from "@assets/generated_images/Technology_news_hero_image_93f09ba8.png";
import politicsHero from "@assets/generated_images/Politics_news_hero_image_67b47093.png";
import worldHero from "@assets/generated_images/World_news_hero_image_36fd524a.png";
import sportsHero from "@assets/generated_images/Sports_news_hero_image_19684b5f.png";
import globalTimesLogo from "@assets/generated_images/Global_Times_publisher_logo_ca784f81.png";
import techDailyLogo from "@assets/generated_images/Tech_Daily_publisher_logo_1c01fd2a.png";
import worldReportLogo from "@assets/generated_images/World_Report_publisher_logo_e02698d3.png";

type Bias = "left" | "center" | "right";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBias, setSelectedBias] = useState<Bias[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const breakingNews = [
    { id: "1", text: "Major economic summit concludes with new trade agreements" },
    { id: "2", text: "Tech giant announces breakthrough in quantum computing" },
    { id: "3", text: "International climate accord signed by 50 nations" },
  ];

  const categories = ["Politics", "Business", "Technology", "Sports", "World", "Health"];

  const mockArticles = [
    {
      id: "1",
      title: "Global Markets Rally as Economic Indicators Show Strong Growth",
      excerpt: "Stock markets worldwide experience significant gains following positive employment data and manufacturing reports across major economies.",
      imageUrl: businessHero,
      publisher: { name: "Global Times", logo: globalTimesLogo },
      author: "Sarah Johnson",
      category: "Business",
      bias: "center" as Bias,
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: "2",
      title: "AI Breakthrough Promises Revolutionary Changes in Healthcare Diagnostics",
      excerpt: "New artificial intelligence system demonstrates unprecedented accuracy in early disease detection, potentially saving millions of lives.",
      imageUrl: techHero,
      publisher: { name: "Tech Daily", logo: techDailyLogo },
      author: "Michael Chen",
      category: "Technology",
      bias: "left" as Bias,
      publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      id: "3",
      title: "Political Leaders Gather for Historic Climate Summit in Geneva",
      excerpt: "World leaders convene to discuss ambitious carbon reduction targets and sustainable energy transition strategies.",
      imageUrl: politicsHero,
      publisher: { name: "World Report", logo: worldReportLogo },
      author: "Emma Rodriguez",
      category: "Politics",
      bias: "center" as Bias,
      publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      id: "4",
      title: "Global Supply Chains Show Signs of Recovery After Years of Disruption",
      excerpt: "Manufacturing sector reports improved logistics performance and reduced shipping delays worldwide.",
      imageUrl: worldHero,
      publisher: { name: "Global Times", logo: globalTimesLogo },
      author: "David Park",
      category: "Business",
      bias: "right" as Bias,
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    },
    {
      id: "5",
      title: "Championship Finals Draw Record Viewership Across Multiple Platforms",
      excerpt: "Historic sporting event breaks streaming records as millions tune in globally for thrilling finale.",
      imageUrl: sportsHero,
      publisher: { name: "World Report", logo: worldReportLogo },
      author: "James Miller",
      category: "Sports",
      bias: "center" as Bias,
      publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
    },
    {
      id: "6",
      title: "New Trade Partnership Strengthens Economic Ties Between Continents",
      excerpt: "Historic agreement opens new markets and creates opportunities for businesses on both sides.",
      imageUrl: businessHero,
      publisher: { name: "Tech Daily", logo: techDailyLogo },
      author: "Lisa Thompson",
      category: "World",
      bias: "left" as Bias,
      publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
  ];

  const filteredArticles = mockArticles.filter((article) => {
    const categoryMatch = !selectedCategory || article.category === selectedCategory;
    const biasMatch = selectedBias.length === 0 || selectedBias.includes(article.bias);
    const searchMatch = !searchQuery || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && biasMatch && searchMatch;
  });

  const featuredArticle = filteredArticles[0];
  const trendingArticles = filteredArticles.slice(1, 4);
  const mainArticles = filteredArticles.slice(4);

  return (
    <div className="min-h-screen bg-background">
      <BreakingNewsTicker items={breakingNews} />
      <Header onSearch={setSearchQuery} />

      <main className="container mx-auto px-4 lg:px-8 py-8">
        <div className="mb-8">
          <CategoryPills
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <section>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  {featuredArticle && (
                    <ArticleCard
                      article={featuredArticle}
                      variant="featured"
                      onClick={() => setLocation(`/article/${featuredArticle.id}`)}
                    />
                  )}
                </div>
                <div className="space-y-4">
                  <h2 className="text-xl font-bold">Trending Now</h2>
                  {trendingArticles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      variant="compact"
                      onClick={() => setLocation(`/article/${article.id}`)}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-6">Latest News</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mainArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    variant="standard"
                    onClick={() => setLocation(`/article/${article.id}`)}
                  />
                ))}
              </div>
            </section>

            {filteredArticles.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No articles found matching your filters.</p>
              </div>
            )}
          </div>

          <aside className="hidden lg:block">
            <Card className="sticky top-24 border-card-border">
              <CardContent className="p-6 space-y-6">
                <BiasFilter selectedBias={selectedBias} onBiasChange={setSelectedBias} />
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
