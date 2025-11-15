import { Card, CardContent } from "@/components/ui/card";
import { BiasIndicator } from "./BiasIndicator";
import { CategoryBadge } from "./CategoryBadge";
import { PublisherBadge } from "./PublisherBadge";
import { formatDistanceToNow } from "date-fns";
import { Bookmark } from "lucide-react";
import { useState } from "react";

type Bias = "left" | "center" | "right";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  publisher: {
    name: string;
    logo?: string;
  };
  author: string;
  category: string;
  bias: Bias;
  publishedAt: Date;
}

interface ArticleCardProps {
  article: Article;
  variant?: "standard" | "featured" | "compact";
  onClick?: () => void;
}

export function ArticleCard({ article, variant = "standard", onClick }: ArticleCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
    console.log(`Article ${article.id} ${isBookmarked ? 'unbookmarked' : 'bookmarked'}`);
  };

  if (variant === "featured") {
    return (
      <Card
        className="relative overflow-hidden cursor-pointer group hover-elevate active-elevate-2 transition-all border-card-border"
        onClick={onClick}
        data-testid={`card-article-${article.id}`}
      >
        <div className="relative h-96">
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <CategoryBadge category={article.category} />
              <BiasIndicator bias={article.bias} size="sm" />
            </div>
            <h2 className="text-4xl font-bold mb-3 line-clamp-3">{article.title}</h2>
            <p className="text-lg mb-4 line-clamp-2 text-white/90">{article.excerpt}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <PublisherBadge name={article.publisher.name} logo={article.publisher.logo} />
                <span className="text-sm text-white/80">
                  {formatDistanceToNow(article.publishedAt, { addSuffix: true })}
                </span>
              </div>
              <button
                onClick={handleBookmark}
                className="p-2 rounded-md hover-elevate active-elevate-2 bg-white/10 backdrop-blur-sm"
                data-testid="button-bookmark"
              >
                <Bookmark className={`w-5 h-5 ${isBookmarked ? "fill-current" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (variant === "compact") {
    return (
      <Card
        className="cursor-pointer hover-elevate active-elevate-2 transition-all border-card-border"
        onClick={onClick}
        data-testid={`card-article-${article.id}`}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-24 h-24 object-cover rounded-md flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <BiasIndicator bias={article.bias} size="sm" />
                <CategoryBadge category={article.category} />
              </div>
              <h3 className="font-semibold text-base line-clamp-2 mb-2">{article.title}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">{article.publisher.name}</span>
                <span>•</span>
                <span>{formatDistanceToNow(article.publishedAt, { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="cursor-pointer overflow-hidden hover-elevate active-elevate-2 transition-all border-card-border"
      onClick={onClick}
      data-testid={`card-article-${article.id}`}
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={article.imageUrl}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BiasIndicator bias={article.bias} size="sm" />
          <CategoryBadge category={article.category} />
        </div>
        <h3 className="font-bold text-lg line-clamp-2 mb-2">{article.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{article.excerpt}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PublisherBadge name={article.publisher.name} logo={article.publisher.logo} size="sm" />
            <span>•</span>
            <span>{formatDistanceToNow(article.publishedAt, { addSuffix: true })}</span>
          </div>
          <button
            onClick={handleBookmark}
            className="p-2 rounded-md hover-elevate active-elevate-2"
            data-testid="button-bookmark"
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
