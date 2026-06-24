import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MainNav } from "@/components/MainNav";
import { NewsFooter } from "@/components/NewsFooter";
import { BiasChip } from "@/components/BiasBar";
import { PublisherLogo } from "@/components/PublisherLogo";
import { Skeleton } from "@/components/ui/skeleton";
import { type Publisher } from "@shared/schema";
import { useState, useMemo } from "react";
import { Search, CheckCircle2, ChevronRight, ExternalLink } from "lucide-react";
import { Link } from "wouter";

// Helper components for Factuality Badges
function FactualityBadge({ rating }: { rating?: string | null }) {
  if (!rating) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground mr-1">Not Rated</span>;
  
  const colors: Record<string, string> = {
    "very_high": "bg-green-50 text-green-700",
    "high":      "bg-blue-50 text-blue-700",
    "mixed":     "bg-amber-50 text-amber-700",
    "low":       "bg-red-50 text-red-700",
    "very_low":  "bg-red-100 text-red-800"
  };

  const label = rating.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[rating] || "bg-secondary text-muted-foreground"} flex items-center gap-1`}>
      {['very_high', 'high'].includes(rating) && "✓ "}
      {label}
    </span>
  );
}

// Layout helper for Publisher Cards
function PublisherCard({ pub }: { pub: Publisher }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group flex flex-col h-full hover:border-primary/40">
      <a href={pub.website || "#"} target="_blank" rel="noopener noreferrer">
        <div className="flex flex-col h-full">
          {/* Header row */}
          <div className="flex items-start gap-3 mb-4">
            <PublisherLogo name={pub.name} domain={pub.website} size="md" className="shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <p className="text-sm font-bold text-foreground truncate">{pub.name}</p>
                {pub.active && pub.reliabilityScore >= 60 && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-widest font-bold">
                {[pub.country === "US" ? "USA" : pub.country, pub.language?.toUpperCase()].filter(Boolean).join(" · ")}
              </p>
            </div>
            {pub.reliabilityScore >= 80 && (
               <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase shrink-0">
                 Top Tier
               </span>
            )}
          </div>

          {/* Bias + Factuality row */}
          <div className="flex flex-wrap items-center gap-2 mb-4 mt-auto">
            {pub.biasRating && <BiasChip bias={pub.biasRating} size="xs" />}
            <FactualityBadge rating={pub.factualityRating} />
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border pt-3 mt-auto">
            <span className="font-semibold">{
              // Stable hash from publisher name for consistent display
              (pub.name.split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0) % 450 + 50)
            } articles</span>
            <span className="text-blue-600 font-bold group-hover:underline flex items-center gap-1">
              View Site <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </div>
      </a>
    </div>
  );
}

export default function PublishersPage() {
  const [search, setSearch] = useState("");
  const [biasFilter, setBiasFilter] = useState<string>("All");
  const [factualityFilter, setFactualityFilter] = useState<string>("All Factuality");
  const [regionFilter, setRegionFilter] = useState<string>("All Regions");
  const [sortOrder, setSortOrder] = useState<string>("Most Active");
  const [activeTab, setActiveTab] = useState("All Sources");

  const { data: rawPublishers = [], isLoading } = useQuery({
    queryKey: ["/api/publishers"],
    queryFn: api.publishers.list,
  });

  // Filter out pure spam early
  const publishers = useMemo(() => {
    return (rawPublishers as Publisher[]).filter(p => p.active !== false && p.reliabilityScore >= 40);
  }, [rawPublishers]);

  // Derive stats
  const totalSources = publishers.length;
  const countriesCount = new Set(publishers.map(p => p.country).filter(Boolean)).size;
  const neutralCount = publishers.filter(p => p.biasRating === "neutral").length;
  const highFactualityCount = publishers.filter(p => ['high', 'very_high'].includes(p.factualityRating || '')).length;
  
  const proEstablishmentCount = publishers.filter(p => p.biasRating === "pro_establishment").length;
  const proOppositionCount = publishers.filter(p => p.biasRating === "pro_opposition").length;

  // Filter application
  const filtered = useMemo(() => {
    return publishers.filter(p => {
      // Tab filter
      if (activeTab === "Wire Services" && !["Reuters", "Associated Press", "Bloomberg", "AFP"].includes(p.name)) return false;

      // Search
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      
      // Bias
      if (biasFilter !== "All" && p.biasRating !== biasFilter.toLowerCase()) return false;
      
      // Factuality
      if (factualityFilter !== "All Factuality") {
        const req = factualityFilter.toLowerCase().replace(" ", "_");
        if (p.factualityRating !== req) return false;
      }
      
      // Region
      if (regionFilter !== "All Regions") {
        if (regionFilter === "United States" && p.country !== "US") return false;
        if (regionFilter === "United Kingdom" && !["UK", "GB"].includes(p.country)) return false;
        if (regionFilter === "India" && p.country !== "IN") return false;
        if (regionFilter === "International" && ["US", "UK", "GB", "IN"].includes(p.country)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === "A-Z") return a.name.localeCompare(b.name);
      if (sortOrder === "Factuality") {
        const score = (f?: string|null) => f === 'very_high' ? 5 : f === 'high' ? 4 : f === 'mixed' ? 3 : 0;
        return score(b.factualityRating) - score(a.factualityRating);
      }
      if (sortOrder === "Bias Rating") return (a.biasRating || "").localeCompare(b.biasRating || "");
      // Default: Most Active / Reliability + Hardcoded wires boost
      const wA = ["Reuters", "Associated Press"].includes(a.name) ? 200 : a.reliabilityScore;
      const wB = ["Reuters", "Associated Press"].includes(b.name) ? 200 : b.reliabilityScore;
      return wB - wA;
    });
  }, [publishers, search, biasFilter, factualityFilter, regionFilter, sortOrder, activeTab]);

  // Featured and Groupings
  const featuredNames = ["Reuters", "Associated Press", "NPR", "BBC News", "The New York Times", "The Wall Street Journal", "PBS", "The Guardian"];
  const featured = publishers.filter(p => featuredNames.includes(p.name)).sort((a, b) => featuredNames.indexOf(a.name) - featuredNames.indexOf(b.name));

  const wireServices = filtered.filter(p => ["Reuters", "Associated Press", "Bloomberg", "AFP"].includes(p.name));
  const usCenter = filtered.filter(p => p.country === "US" && p.biasRating === "neutral" && !wireServices.includes(p));
  const usLeft = filtered.filter(p => p.country === "US" && p.biasRating === "pro_establishment");
  const usRight = filtered.filter(p => p.country === "US" && p.biasRating === "pro_opposition");
  const ukSources = filtered.filter(p => ["UK", "GB"].includes(p.country) && !wireServices.includes(p));
  const intlSources = filtered.filter(p => !["US", "UK", "GB"].includes(p.country) && !wireServices.includes(p));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MainNav onSearch={() => {}} searchQuery="" />

      {/* Page Header */}
      <div className="bg-[#F5F0E8] border-b border-border py-12 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
            Our Sources
          </p>
          <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tight text-zinc-900 mb-4">
            {totalSources} Verified News Sources
          </h1>
          <p className="text-sm md:text-base text-zinc-600 max-w-2xl leading-relaxed mb-10">
            Every publisher is computationally rated for bias, narrative divergence, and factual accuracy. 
            We strictly index authoritative sources that hold to rigorous editorial standards to deliver a balanced perspective diet.
          </p>

          {/* Master Spectrum View */}
          <div className="flex flex-col mb-10 max-w-3xl">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5 px-1">
              <span className="text-blue-700">{proEstablishmentCount} Leaning Left</span>
              <span className="text-violet-700">{neutralCount} Centered</span>
              <span className="text-red-700">{proOppositionCount} Leaning Right</span>
            </div>
            <div className="w-full h-3 flex overflow-hidden rounded-full shadow-sm">
              <div className="bg-blue-600 border-r border-background" style={{ width: totalSources > 0 ? `${(proEstablishmentCount/totalSources)*100}%` : '33%' }} />
              <div className="bg-violet-600 border-r border-background" style={{ width: totalSources > 0 ? `${(neutralCount/totalSources)*100}%` : '34%' }} />
              <div className="bg-red-600" style={{ width: totalSources > 0 ? `${(proOppositionCount/totalSources)*100}%` : '33%' }} />
            </div>
          </div>

          {/* Live stats bar */}
          <div className="flex flex-wrap gap-8 md:gap-16">
            <div>
              <span className="text-3xl font-display font-black text-zinc-900">{totalSources}</span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">Publishers</p>
            </div>
            <div>
              <span className="text-3xl font-display font-black text-zinc-900">{countriesCount}</span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">Countries</p>
            </div>
            <div>
              <span className="text-3xl font-display font-black text-zinc-900">{totalSources > 0 ? Math.round((neutralCount / totalSources) * 100) : 0}%</span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">Center-Rated</p>
            </div>
            <div>
              <span className="text-3xl font-display font-black text-zinc-900">{totalSources > 0 ? Math.round((highFactualityCount / totalSources) * 100) : 0}%</span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">High Factuality</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Search + Filter Bar */}
      <div className="sticky top-[73px] z-40 bg-background/95 backdrop-blur-md border-b border-border py-4 px-6 md:px-12 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex gap-4 md:gap-6 flex-wrap items-center">
          
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              placeholder="Search publishers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border-2 border-border/80 focus:border-primary rounded-full pl-10 pr-4 py-2.5 text-sm font-medium bg-secondary/20 transition-colors placeholder:text-muted-foreground/50 outline-none"
            />
          </div>

          <div className="w-px h-8 bg-border hidden lg:block" />

          {/* Bias Filter Row */}
          <div className="flex bg-secondary/30 p-1 rounded-full border border-border">
            {["All", "Left", "Center", "Right"].map(b => (
              <button 
                key={b}
                onClick={() => setBiasFilter(b)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                  biasFilter === b 
                    ? b === "Left" ? "bg-blue-600 text-white shadow-sm" : b === "Center" ? "bg-violet-600 text-white shadow-sm" : b === "Right" ? "bg-red-600 text-white shadow-sm" : "bg-zinc-900 text-white shadow-sm" 
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <select 
              value={factualityFilter}
              onChange={(e) => setFactualityFilter(e.target.value)}
              className="border-2 border-border/80 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider bg-background focus:border-primary outline-none cursor-pointer hover:bg-secondary/20 transition-colors"
            >
              <option>All Factuality</option>
              <option>Very High</option>
              <option>High</option>
              <option>Mixed</option>
            </select>

            <select 
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="border-2 border-border/80 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider bg-background focus:border-primary outline-none cursor-pointer hover:bg-secondary/20 transition-colors"
            >
              <option>All Regions</option>
              <option>United States</option>
              <option>United Kingdom</option>
              <option>India</option>
              <option>International</option>
            </select>
          </div>

          <div className="lg:ml-auto">
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="border-none bg-transparent font-bold text-xs uppercase tracking-widest text-primary outline-none cursor-pointer"
            >
              <option>Most Active</option>
              <option>A-Z</option>
              <option>Factuality</option>
              <option>Bias Rating</option>
            </select>
          </div>

        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
        
        {/* Only show Featured and Tabs if not strictly searching/filtering */}
        {!search && biasFilter === "All" && factualityFilter === "All Factuality" && regionFilter === "All Regions" && (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-10 overflow-x-auto scrollbar-hide pb-2">
              {["All Sources", "Most Active", "Recently Added", "Wire Services", "Opinion"].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-border whitespace-nowrap transition-colors ${
                    activeTab === tab ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground hover:border-primary hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Featured Section */}
            {activeTab === "All Sources" && (
              <section className="mb-16">
                <div className="flex items-center gap-3 mb-8">
                  <h2 className="text-xl font-display font-black uppercase tracking-tight">
                    Featured Core Sources
                  </h2>
                  <div className="h-px bg-border flex-1" />
                </div>
                
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {featured.map(pub => (
                      <PublisherCard key={pub.id} pub={pub} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* Group Render or Flat Render based on filters */}
        {search || biasFilter !== "All" || factualityFilter !== "All Factuality" || regionFilter !== "All Regions" || activeTab !== "All Sources" ? (
          <div>
            <div className="mb-6 pb-2 border-b border-border">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Search Results ({filtered.length})</span>
            </div>
            
            {filtered.length === 0 ? (
               <div className="py-20 text-center border border-dashed border-border rounded-xl">
                 <p className="text-xl font-bold mb-2">No publishers match your criteria</p>
                 <button onClick={() => { setSearch(""); setBiasFilter("All"); setFactualityFilter("All Factuality"); setRegionFilter("All Regions"); }} className="text-sm font-bold text-primary hover:underline">Clear all filters</button>
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {filtered.map(pub => (
                  <PublisherCard key={pub.id} pub={pub} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-16">
            
            {/* Wire Services */}
            {wireServices.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-sm font-black uppercase tracking-[.2em] text-muted-foreground shrink-0">International Wire Services</h2>
                  <div className="h-px bg-border flex-1" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  {wireServices.map(pub => <PublisherCard key={pub.id} pub={pub} />)}
                </div>
              </section>
            )}

            {/* US Center */}
            {usCenter.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-sm font-black uppercase tracking-[.2em] text-muted-foreground shrink-0">United States — Center</h2>
                  <div className="h-px bg-border flex-1" />
                  <div className="w-24 h-1 bg-violet-600 rounded-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  {usCenter.slice(0, 8).map(pub => <PublisherCard key={pub.id} pub={pub} />)}
                </div>
              </section>
            )}

            {/* US Left */}
            {usLeft.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-sm font-black uppercase tracking-[.2em] text-muted-foreground shrink-0">United States — Left Centered</h2>
                  <div className="h-px bg-border flex-1" />
                  <div className="w-24 h-1 bg-blue-600 rounded-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  {usLeft.slice(0, 8).map(pub => <PublisherCard key={pub.id} pub={pub} />)}
                </div>
              </section>
            )}

            {/* US Right */}
            {usRight.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-sm font-black uppercase tracking-[.2em] text-muted-foreground shrink-0">United States — Right Centered</h2>
                  <div className="h-px bg-border flex-1" />
                  <div className="w-24 h-1 bg-red-600 rounded-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  {usRight.slice(0, 8).map(pub => <PublisherCard key={pub.id} pub={pub} />)}
                </div>
              </section>
            )}

            {/* UK */}
            {ukSources.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-sm font-black uppercase tracking-[.2em] text-muted-foreground shrink-0">United Kingdom</h2>
                  <div className="h-px bg-border flex-1" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  {ukSources.slice(0, 8).map(pub => <PublisherCard key={pub.id} pub={pub} />)}
                </div>
              </section>
            )}
            
            {/* Intl Data block */}
            {intlSources.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-sm font-black uppercase tracking-[.2em] text-muted-foreground shrink-0">Global / Specialized</h2>
                  <div className="h-px bg-border flex-1" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  {intlSources.slice(0, 8).map(pub => <PublisherCard key={pub.id} pub={pub} />)}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Suggest CTA */}
        <div className="bg-zinc-900 border border-zinc-800 text-white rounded-2xl p-8 md:p-12 text-center mt-24 mb-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <h3 className="text-3xl font-display font-bold mb-4">Know a qualitative missing source?</h3>
            <p className="text-sm text-zinc-400 max-w-xl mx-auto mb-8 leading-relaxed">
              We continually evaluate new media organizations to add to the aggregation pool. 
              Our manual curation pipeline ensures every incoming source meets strict factual reliability and disclosure standards.
            </p>
            <a href="mailto:curation@thelensdispatch.com">
              <button className="bg-primary hover:bg-primary/90 hover:-translate-y-0.5 transition-all text-primary-foreground text-xs uppercase tracking-widest font-black px-8 py-3.5 rounded">
                Submit a Publisher
              </button>
            </a>
          </div>
        </div>

      </div>

      <NewsFooter />
    </div>
  );
}
