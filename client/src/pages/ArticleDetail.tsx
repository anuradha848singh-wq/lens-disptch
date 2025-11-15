import { Header } from "@/components/Header";
import { BiasIndicator } from "@/components/BiasIndicator";
import { CategoryBadge } from "@/components/CategoryBadge";
import { PublisherBadge } from "@/components/PublisherBadge";
import { ArticleCard } from "@/components/ArticleCard";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Share2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import businessHero from "@assets/generated_images/Business_news_hero_image_33ed114d.png";
import techHero from "@assets/generated_images/Technology_news_hero_image_93f09ba8.png";
import politicsHero from "@assets/generated_images/Politics_news_hero_image_67b47093.png";
import globalTimesLogo from "@assets/generated_images/Global_Times_publisher_logo_ca784f81.png";
import techDailyLogo from "@assets/generated_images/Tech_Daily_publisher_logo_1c01fd2a.png";

type Bias = "left" | "center" | "right";

export default function ArticleDetail() {
  const [, setLocation] = useLocation();
  const { id } = useParams();
  const [isBookmarked, setIsBookmarked] = useState(false);

  const article = {
    id: id || "1",
    title: "Global Markets Rally as Economic Indicators Show Strong Growth",
    imageUrl: businessHero,
    publisher: { name: "Global Times", logo: globalTimesLogo },
    author: "Sarah Johnson",
    category: "Business",
    bias: "center" as Bias,
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    tags: ["Economy", "Stock Market", "GDP", "Employment"],
    content: `
      <p class="text-lg mb-6">Stock markets worldwide experienced significant gains following positive employment data and manufacturing reports across major economies. The rally reflects growing investor confidence in the global economic recovery.</p>
      
      <h2 class="text-2xl font-bold mt-8 mb-4">Strong Economic Fundamentals</h2>
      <p class="mb-4">Recent data from multiple sources indicates robust economic performance across key sectors. Manufacturing output has exceeded expectations, while employment figures show continued job creation in both developed and emerging markets.</p>
      
      <p class="mb-4">Analysts point to several factors contributing to this positive momentum, including stabilizing supply chains, increased consumer spending, and supportive monetary policies from central banks around the world.</p>
      
      <h2 class="text-2xl font-bold mt-8 mb-4">Market Response</h2>
      <p class="mb-4">Major stock indices registered substantial gains, with technology and consumer discretionary sectors leading the advance. Trading volumes remained elevated throughout the session, suggesting broad-based participation in the rally.</p>
      
      <p class="mb-4">Currency markets also reflected the optimistic sentiment, with risk-on currencies strengthening against traditional safe havens. Commodity prices showed mixed performance, with industrial metals advancing while precious metals declined.</p>
      
      <h2 class="text-2xl font-bold mt-8 mb-4">Looking Ahead</h2>
      <p class="mb-4">While the current data paints an encouraging picture, economists caution that challenges remain. Geopolitical tensions, potential policy changes, and lingering inflation concerns continue to pose risks to the economic outlook.</p>
      
      <p class="mb-4">Investors will be closely watching upcoming central bank meetings and additional economic data releases for further confirmation of the recovery's sustainability and strength.</p>
    `,
  };

  const relatedArticles = [
    {
      id: "2",
      title: "AI Breakthrough Promises Revolutionary Changes in Healthcare",
      excerpt: "New artificial intelligence system demonstrates unprecedented accuracy in early disease detection.",
      imageUrl: techHero,
      publisher: { name: "Tech Daily", logo: techDailyLogo },
      author: "Michael Chen",
      category: "Technology",
      bias: "left" as Bias,
      publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      id: "3",
      title: "Political Leaders Gather for Historic Climate Summit",
      excerpt: "World leaders convene to discuss ambitious carbon reduction targets.",
      imageUrl: politicsHero,
      publisher: { name: "Global Times", logo: globalTimesLogo },
      author: "Emma Rodriguez",
      category: "Politics",
      bias: "center" as Bias,
      publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={() => {}} />

      <main className="container mx-auto px-4 lg:px-8 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <article>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <CategoryBadge category={article.category} />
              <BiasIndicator bias={article.bias} />
            </div>
            <h1 className="text-5xl font-bold mb-6" data-testid="text-article-title">{article.title}</h1>
          </div>

          <div className="flex items-center justify-between mb-8 pb-6 border-b">
            <div className="flex items-center gap-4">
              <PublisherBadge name={article.publisher.name} logo={article.publisher.logo} size="md" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">By {article.author}</p>
                <p>{formatDistanceToNow(article.publishedAt, { addSuffix: true })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setIsBookmarked(!isBookmarked);
                  console.log(`Article ${isBookmarked ? 'unbookmarked' : 'bookmarked'}`);
                }}
                data-testid="button-bookmark-article"
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => console.log("Share clicked")}
                data-testid="button-share"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="mb-8">
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-auto max-h-[600px] object-cover rounded-lg"
            />
          </div>

          <div
            className="prose prose-lg dark:prose-invert max-w-none mb-8"
            dangerouslySetInnerHTML={{ __html: article.content }}
            data-testid="text-article-content"
          />

          <div className="mb-8">
            <h3 className="text-sm font-semibold mb-3">Tags</h3>
            <div className="flex gap-2 flex-wrap">
              {article.tags.map((tag) => (
                <CategoryBadge key={tag} category={tag} />
              ))}
            </div>
          </div>
        </article>

        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedArticles.map((relatedArticle) => (
              <ArticleCard
                key={relatedArticle.id}
                article={relatedArticle}
                variant="standard"
                onClick={() => setLocation(`/article/${relatedArticle.id}`)}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
