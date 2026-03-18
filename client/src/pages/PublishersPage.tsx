import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MainNav } from "@/components/MainNav";
import { NewsFooter } from "@/components/NewsFooter";
import { StoryCard } from "@/components/StoryCard";
import { BiasChip } from "@/components/BiasBar";
import { Skeleton } from "@/components/ui/skeleton";
import { type Publisher } from "@shared/schema";
import { useState } from "react";
import { ExternalLink, Building2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function PublishersPage() {
  const [selectedPublisher, setSelectedPublisher] = useState<Publisher | null>(null);
  const [search, setSearch] = useState("");
  const [biasFilter, setBiasFilter] = useState<string>("all");

  const { data: publishers = [], isLoading: loadingPubs } = useQuery({
    queryKey: ["/api/publishers"],
    queryFn: api.publishers.list,
  });

  const { data: articlesData } = useQuery({
    queryKey: ["/api/articles", { limit: 12 }],
    queryFn: () => api.articles.list({ limit: 12 }),
  });

  const articles = articlesData?.articles ?? [];
  const filtered = (publishers as Publisher[]).filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchBias = biasFilter === "all" || p.biasRating === biasFilter;
    return matchSearch && matchBias;
  });

  const displayArticles = selectedPublisher
    ? articles.filter((a) => a.publisherId === selectedPublisher.id)
    : articles;

  return (
    <div className="min-h-screen bg-background">
      <MainNav onSearch={() => {}} searchQuery="" />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">News Publishers</h1>
          <span className="text-sm text-muted-foreground">— {(publishers as Publisher[]).length} sources rated</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Publisher list */}
          <aside>
            {/* Filters */}
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search publishers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                  data-testid="input-publisher-search"
                />
              </div>
              <div className="flex gap-1">
                {["all", "left", "center", "right"].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBiasFilter(b)}
                    className={`flex-1 py-1 text-[10px] font-bold uppercase rounded transition-colors ${
                      biasFilter === b
                        ? b === "left" ? "bg-blue-500 text-white" : b === "center" ? "bg-violet-500 text-white" : b === "right" ? "bg-red-500 text-white" : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`publisher-filter-${b}`}
                  >
                    {b === "all" ? "All" : b.charAt(0).toUpperCase() + b.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card border border-card-border rounded overflow-hidden">
              <div className="px-3 py-2 border-b bg-muted/50">
                <span className="text-xs font-bold text-muted-foreground">{filtered.length} publishers</span>
              </div>
              {loadingPubs ? (
                <div className="p-3 space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                  {filtered.map((pub: Publisher) => (
                    <button
                      key={pub.id}
                      onClick={() => setSelectedPublisher(selectedPublisher?.id === pub.id ? null : pub)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover-elevate transition-colors ${
                        selectedPublisher?.id === pub.id ? "bg-secondary" : ""
                      }`}
                      data-testid={`publisher-${pub.id}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-black text-muted-foreground flex-shrink-0">
                        {pub.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{pub.name}</p>
                        {pub.country && <p className="text-[10px] text-muted-foreground">{pub.country}</p>}
                      </div>
                      {pub.biasRating && <BiasChip bias={pub.biasRating} size="xs" />}
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">No publishers match</p>
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* Main: Publisher detail or article grid */}
          <main>
            {selectedPublisher ? (
              <div>
                {/* Publisher header */}
                <div className="bg-card border border-card-border rounded p-5 mb-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center text-lg font-black text-muted-foreground flex-shrink-0">
                      {selectedPublisher.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1 flex-wrap gap-y-2">
                        <h2 className="text-xl font-bold">{selectedPublisher.name}</h2>
                        {selectedPublisher.biasRating && <BiasChip bias={selectedPublisher.biasRating} />}
                      </div>
                      {selectedPublisher.description && (
                        <p className="text-sm text-muted-foreground mb-2">{selectedPublisher.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {selectedPublisher.country && <span>{selectedPublisher.country}</span>}
                        {selectedPublisher.founded && <span>Est. {selectedPublisher.founded}</span>}
                        {selectedPublisher.website && (
                          <a href={selectedPublisher.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                            <ExternalLink className="w-3 h-3" />{selectedPublisher.website}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-bold mb-3">
                  {displayArticles.length > 0 ? `Articles from ${selectedPublisher.name}` : "No articles yet from this publisher"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {displayArticles.map((a) => (
                    <StoryCard key={a.id} article={a} variant="standard" />
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-sm font-bold mb-4 text-muted-foreground">
                  Select a publisher to see their stories and bias details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {(publishers as Publisher[]).map((pub) => (
                    <button
                      key={pub.id}
                      onClick={() => setSelectedPublisher(pub)}
                      className="bg-card border border-card-border rounded p-4 text-left hover-elevate transition-all cursor-pointer"
                      data-testid={`publisher-card-${pub.id}`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-black text-muted-foreground flex-shrink-0">
                          {pub.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{pub.name}</p>
                          {pub.country && <p className="text-[10px] text-muted-foreground">{pub.country}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {pub.biasRating && <BiasChip bias={pub.biasRating} size="xs" />}
                        {pub.founded && <span className="text-[10px] text-muted-foreground">Est. {pub.founded}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <NewsFooter />
    </div>
  );
}
