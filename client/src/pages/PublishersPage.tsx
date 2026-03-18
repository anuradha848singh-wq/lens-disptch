import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TopBanner } from "@/components/TopBanner";
import { MainNav } from "@/components/MainNav";
import { NewsFooter } from "@/components/NewsFooter";
import { StoryCard } from "@/components/StoryCard";
import { BiasChip } from "@/components/BiasBar";
import { Skeleton } from "@/components/ui/skeleton";
import { type Publisher, type ArticleWithDetails } from "@shared/schema";
import { useState } from "react";
import { ExternalLink, Building2 } from "lucide-react";

export default function PublishersPage() {
  const [selectedPublisher, setSelectedPublisher] = useState<Publisher | null>(null);

  const { data: publishers = [], isLoading: loadingPubs } = useQuery({
    queryKey: ["/api/publishers"],
    queryFn: api.publishers.list,
  });

  const { data: articlesData } = useQuery({
    queryKey: ["/api/articles", { publisherId: selectedPublisher?.id, limit: 12 }],
    queryFn: () => api.articles.list({ limit: 12 }),
    enabled: true,
  });

  const articles = articlesData?.articles ?? [];

  return (
    <div className="min-h-screen bg-background">
      <TopBanner />
      <MainNav onSearch={() => {}} searchQuery="" />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">News Publishers</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          <aside>
            <div className="bg-card border border-card-border rounded-md overflow-hidden">
              <div className="p-3 border-b">
                <h2 className="text-sm font-bold">All Publishers</h2>
              </div>
              {loadingPubs ? (
                <div className="p-3 space-y-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="divide-y">
                  <button
                    onClick={() => setSelectedPublisher(null)}
                    className={`w-full px-3 py-3 text-left text-sm flex items-center gap-3 hover-elevate active-elevate-2 transition-colors ${
                      !selectedPublisher ? "bg-secondary font-semibold" : ""
                    }`}
                  >
                    All publishers
                  </button>
                  {(publishers as Publisher[]).map((pub: Publisher) => (
                    <button
                      key={pub.id}
                      onClick={() => setSelectedPublisher(pub)}
                      className={`w-full px-3 py-3 text-left hover-elevate active-elevate-2 transition-colors ${
                        selectedPublisher?.id === pub.id ? "bg-secondary" : ""
                      }`}
                      data-testid={`publisher-btn-${pub.id}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-muted rounded flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                          {pub.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{pub.name}</p>
                          {pub.biasRating && <BiasChip bias={pub.biasRating} />}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <div>
            {selectedPublisher && (
              <div className="bg-card border border-card-border rounded-md p-4 mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center font-bold text-muted-foreground">
                      {selectedPublisher.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-bold text-lg">{selectedPublisher.name}</h2>
                      {selectedPublisher.description && (
                        <p className="text-sm text-muted-foreground mt-1">{selectedPublisher.description}</p>
                      )}
                      {selectedPublisher.biasRating && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Bias rating:</span>
                          <BiasChip bias={selectedPublisher.biasRating} />
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedPublisher.website && (
                    <a
                      href={selectedPublisher.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                    >
                      Visit site <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((article: ArticleWithDetails) => (
                <StoryCard key={article.id} article={article} variant="standard" />
              ))}
            </div>

            {articles.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <p>No articles found</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <NewsFooter />
    </div>
  );
}
