/**
 * InsightCaption - Plain-English summary of coverage mix
 * 
 * Displays under BiasSpectrumStrip and StoryCard to give users
 * immediate insight without needing to interpret charts.
 * 
 * Example: "9 sources · leans pro_opposition · no regional coverage"
 */

interface InsightCaptionProps {
  proEstablishmentCount: number;
  proOppositionCount: number;
  regionalAlignedCount: number;
  neutralCount: number;
  totalSources: number;
  className?: string;
}

export function InsightCaption({
  proEstablishmentCount,
  proOppositionCount,
  regionalAlignedCount,
  neutralCount,
  totalSources,
  className = ""
}: InsightCaptionProps) {
  
  // Determine dominant lean
  const counts = [
    { name: "pro_establishment", count: proEstablishmentCount, label: "pro-establishment" },
    { name: "pro_opposition", count: proOppositionCount, label: "pro-opposition" },
    { name: "regional_aligned", count: regionalAlignedCount, label: "regional" },
    { name: "neutral", count: neutralCount, label: "neutral" }
  ];
  
  const sorted = [...counts].sort((a, b) => b.count - a.count);
  const dominant = sorted[0];
  const hasMultiplePerspectives = sorted.filter(c => c.count > 0).length >= 3;
  
  // Detect gaps
  const gaps: string[] = [];
  if (proEstablishmentCount === 0 && totalSources >= 3) gaps.push("pro-establishment");
  if (proOppositionCount === 0 && totalSources >= 3) gaps.push("pro-opposition");
  if (regionalAlignedCount === 0 && totalSources >= 3) gaps.push("regional");
  
  // Build caption parts
  const parts: string[] = [];
  
  // Source count
  parts.push(`${totalSources} ${totalSources === 1 ? 'source' : 'sources'}`);
  
  // Lean
  if (hasMultiplePerspectives) {
    parts.push("diverse perspectives");
  } else if (dominant.count > 0) {
    parts.push(`leans ${dominant.label}`);
  }
  
  // Gaps
  if (gaps.length === 1) {
    parts.push(`no ${gaps[0]} coverage`);
  } else if (gaps.length > 1) {
    parts.push(`missing ${gaps.length} perspectives`);
  }
  
  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      {parts.join(" · ")}
    </p>
  );
}

/**
 * Compact variant for smaller cards
 */
export function InsightCaptionCompact({
  proEstablishmentCount,
  proOppositionCount,
  regionalAlignedCount,
  neutralCount,
  totalSources
}: InsightCaptionProps) {
  const counts = [
    { count: proEstablishmentCount, label: "PE" },
    { count: proOppositionCount, label: "PO" },
    { count: regionalAlignedCount, label: "R" },
    { count: neutralCount, label: "N" }
  ];
  
  const activeCounts = counts.filter(c => c.count > 0);
  const display = activeCounts.map(c => `${c.count}${c.label}`).join("/");
  
  return (
    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
      {totalSources} src · {display}
    </span>
  );
}
