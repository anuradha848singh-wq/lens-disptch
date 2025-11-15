import { BreakingNewsTicker } from "../BreakingNewsTicker";

export default function BreakingNewsTickerExample() {
  const breakingNews = [
    { id: "1", text: "Major economic summit concludes with new trade agreements" },
    { id: "2", text: "Tech giant announces breakthrough in quantum computing" },
    { id: "3", text: "International climate accord signed by 50 nations" },
  ];

  return (
    <div>
      <BreakingNewsTicker items={breakingNews} />
      <div className="p-8">
        <p className="text-sm text-muted-foreground">
          The breaking news ticker above scrolls automatically and pauses on hover.
        </p>
      </div>
    </div>
  );
}
