import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "wouter";
import { type Publisher, type Category } from "@shared/schema";
import { BiasChip } from "./BiasBar";

export function CoveredMostBy() {
  const { data: publishers = [] } = useQuery({
    queryKey: ["/api/publishers"],
    queryFn: api.publishers.list,
  });

  return (
    <div className="bg-card border border-card-border rounded-md p-4">
      <h3 className="text-sm font-bold mb-3">Publishers</h3>
      <div className="space-y-2">
        {publishers.slice(0, 5).map((pub: Publisher) => (
          <Link href={`/publishers/${pub.id}`} key={pub.id}>
            <div className="flex items-center gap-2.5 hover-elevate active-elevate-2 rounded p-1.5 -mx-1.5 cursor-pointer">
              <div className="w-7 h-7 rounded bg-muted flex items-center justify-center flex-shrink-0">
                {pub.logoUrl && pub.logoUrl !== "/api/placeholder/200/200" ? (
                  <img src={pub.logoUrl} alt={pub.name} className="w-full h-full object-cover rounded" />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">
                    {pub.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pub.name}</p>
                {pub.biasRating && (
                  <div className="mt-0.5">
                    <BiasChip bias={pub.biasRating} />
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function TrendingTopics() {
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: api.categories.list,
  });

  return (
    <div className="bg-card border border-card-border rounded-md p-4">
      <h3 className="text-sm font-bold mb-3">Topics</h3>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat: Category) => (
          <Link href={`/category/${cat.slug}`} key={cat.id}>
            <span
              className="px-2.5 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-md hover-elevate active-elevate-2 cursor-pointer"
              data-testid={`topic-${cat.slug}`}
            >
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SuggestSourceWidget() {
  return (
    <div className="bg-card border border-card-border rounded-md p-4">
      <h3 className="text-sm font-bold mb-1.5">Suggest a source</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Know a source we should be tracking? Let us know.
      </p>
      <button
        className="text-xs font-medium text-primary hover:underline"
        onClick={() => console.log("Suggest source clicked")}
        data-testid="button-suggest-source"
      >
        Suggest a source &rarr;
      </button>
    </div>
  );
}

export function BlindspotSignup() {
  return (
    <div className="bg-card border border-card-border rounded-md p-4">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
          B
        </div>
        <div>
          <h3 className="text-sm font-bold">Blindspot</h3>
          <p className="text-xs text-muted-foreground">Stories disproportionately covered by one side of the political spectrum.</p>
        </div>
      </div>
      <button
        className="w-full text-xs font-medium border border-border rounded-md py-2 hover-elevate active-elevate-2 text-foreground mt-2"
        data-testid="button-blindspot-signup"
      >
        Sign up for Blindspot Report newsletter
      </button>
    </div>
  );
}
