import { ArticleCard } from "../ArticleCard";
import businessHero from "@assets/generated_images/Business_news_hero_image_33ed114d.png";
import techHero from "@assets/generated_images/Technology_news_hero_image_93f09ba8.png";
import globalTimesLogo from "@assets/generated_images/Global_Times_publisher_logo_ca784f81.png";
import techDailyLogo from "@assets/generated_images/Tech_Daily_publisher_logo_1c01fd2a.png";

export default function ArticleCardExample() {
  const article = {
    id: "1",
    title: "Global Markets Rally as Economic Indicators Show Strong Growth",
    excerpt: "Stock markets worldwide experience significant gains following positive employment data and manufacturing reports.",
    imageUrl: businessHero,
    publisher: {
      name: "Global Times",
      logo: globalTimesLogo,
    },
    author: "Sarah Johnson",
    category: "Business",
    bias: "center" as const,
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  };

  const techArticle = {
    ...article,
    id: "2",
    title: "AI Breakthrough Promises Revolutionary Changes in Healthcare",
    excerpt: "New artificial intelligence system demonstrates unprecedented accuracy in early disease detection.",
    imageUrl: techHero,
    publisher: {
      name: "Tech Daily",
      logo: techDailyLogo,
    },
    category: "Technology",
    bias: "left" as const,
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Featured Article Card</h3>
        <ArticleCard article={article} variant="featured" onClick={() => console.log("Featured article clicked")} />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Standard Article Card</h3>
        <div className="max-w-sm">
          <ArticleCard article={techArticle} variant="standard" onClick={() => console.log("Standard article clicked")} />
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Compact Article Card</h3>
        <ArticleCard article={article} variant="compact" onClick={() => console.log("Compact article clicked")} />
      </div>
    </div>
  );
}
