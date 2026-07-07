import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { type Category } from "@shared/schema";
import { useCountryProfile } from "@/hooks/useCountryProfile";
import { useUrlState } from "@/hooks/useUrlState";
import { useLocation } from "wouter";

const POPULAR_TOPICS = [
  { label: "AI Regulation", tag: "AIREGULATION" },
  { label: "Climate Summit", tag: "CLIMATESUMMIT" },
  { label: "Tech Antitrust", tag: "TECHANTITRUST" },
  { label: "Inflation", tag: "INFLATION" },
  { label: "Immigration", tag: "IMMIGRATION" },
];

const REGIONS = [
  { code: "GLOBAL", label: "GLOBAL", flag: "🌍" },
  { code: "US",     label: "US",     flag: "🇺🇸" },
  { code: "UK",     label: "UK",     flag: "🇬🇧" },
  { code: "IN",     label: "INDIA",  flag: "🇮🇳" },
  { code: "AU",     label: "AUS",    flag: "🇦🇺" },
  { code: "CA",     label: "CANADA", flag: "🇨🇦" },
];

export function CategoryStrip() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { countryCode, setCountryCode } = useCountryProfile();
  const { categoryId: selectedCategoryId, setCategoryId, setSearch } = useUrlState();
  const [location, setLocation] = useLocation();

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: api.categories.list,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
  });

  const { data: trendingTags = [] } = useQuery({
    queryKey: ["/api/tags/trending", 8],
    queryFn: () => fetch("/api/tags/trending?limit=8").then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: activeMarkets = ["GLOBAL", "US"] } = useQuery({
    queryKey: ["/api/markets"],
    queryFn: () => fetch("/api/markets").then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const activeRegions = REGIONS.filter(r => activeMarkets.includes(r.code) || r.code === "GLOBAL");

  const topicsToShow = (Array.isArray(trendingTags) && trendingTags.length > 0
    ? trendingTags.map((t: any) => ({ label: t.name, tag: t.name.replace(/\s+/g, '').toUpperCase() }))
    : POPULAR_TOPICS).filter(t => t.tag.length > 0).slice(0, 5);

  const handleSelectCategory = (id: string | null) => {
    const isFeedPage = location === "/" || location === "/for-you";
    const targetPath = location === "/for-you" ? "/for-you" : "/";
    const slug = id ? (categories as Category[]).find(c => c.id === id)?.slug || null : null;
    
    // Set state
    setCategoryId(id, slug);

    if (!isFeedPage) {
      setLocation(targetPath + (id ? `?cat=${id}&slug=${slug || ''}` : ''));
    }
  };

  const handleSelectTopic = (topic: string) => {
    const isFeedPage = location === "/" || location === "/for-you";
    const targetPath = location === "/for-you" ? "/for-you" : "/";

    // Set state
    setSearch(topic);

    if (!isFeedPage) {
      setLocation(targetPath + `?q=${encodeURIComponent(topic)}`);
    }
  };

  return (
    <div className="border-b border-dashed border-[var(--hairline-dashed)] bg-[var(--paper)] sticky top-[96px] z-40 py-1 flex items-center">
      <div className="max-w-[1800px] w-full mx-auto px-4">
        <div
          ref={scrollRef}
          className="flex items-center gap-4 overflow-x-auto scrollbar-hide py-1"
          role="tablist"
          aria-label="News categories"
        >
          {/* All button */}
          <button
            role="tab"
            aria-selected={selectedCategoryId === null}
            aria-current={selectedCategoryId === null ? "true" : undefined}
            onClick={() => handleSelectCategory(null)}
            className={`
              flex-shrink-0 text-mono-metadata transition-colors uppercase
              ${selectedCategoryId === null
                ? "font-bold text-[var(--ink)] border-b border-[var(--ink)]"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }
            `}
            data-testid="category-all"
          >
            ALL
          </button>

          {/* Category buttons */}
          {(categories as Category[]).map((cat: Category) => {
            const isActive = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? "true" : undefined}
                onClick={() => handleSelectCategory(cat.id)}
                className={`
                  flex-shrink-0 text-mono-metadata transition-colors uppercase
                  ${isActive
                    ? "font-bold text-[var(--ink)] border-b border-[var(--ink)]"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  }
                `}
                data-testid={`category-${cat.slug}`}
              >
                {cat.name.toUpperCase()}
              </button>
            );
          })}

          {/* Divider */}
          <div className="flex-shrink-0 w-px h-3 bg-[var(--hairline)] mx-2" aria-hidden="true" />

          {/* Hashtag topics */}
          {topicsToShow.map((topic) => (
            <button
              key={topic.tag}
              onClick={() => handleSelectTopic(topic.label)}
              className="
                flex-shrink-0 text-mono-metadata lowercase text-[var(--lens-cyan)] hover:opacity-80 transition-opacity
              "
            >
              #{topic.tag.toLowerCase()}
            </button>
          ))}

          {/* Region divider */}
          <div className="flex-shrink-0 w-px h-3 bg-[var(--hairline)] mx-2" aria-hidden="true" />

          {/* Region pills */}
          <div className="flex items-center gap-2">
            {activeRegions.map((region) => {
              const isActive = countryCode === region.code;
              return (
                <button
                  key={region.code}
                  onClick={() => setCountryCode(region.code)}
                  className={`
                    flex-shrink-0 text-mono-metadata px-2 py-0.5 border rounded-none transition-colors
                    ${
                      isActive
                        ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
                        : "border-[var(--hairline)] text-[var(--ink-muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
                    }
                  `}
                  aria-label={`Switch to ${region.label} edition`}
                  aria-pressed={isActive}
                >
                  {region.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
