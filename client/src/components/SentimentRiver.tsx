import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import * as d3 from "d3";

interface SentimentRiverProps {
  categorySlug: string;
}

export function SentimentRiver({ categorySlug }: SentimentRiverProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["/api/analytics/sentiment", categorySlug],
    queryFn: () => api.analytics.sentimentRiver(categorySlug),
  });

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };

    const x = d3.scaleUtc()
      .domain(d3.extent(data, d => new Date(d.date)) as [Date, Date])
      .range([margin.left, width - margin.right]);

    const keys = ["alarming", "tense", "neutral", "calm", "hopeful"];
    const colors = ["#EF4444", "#F59E0B", "#9CA3AF", "#10B981", "#3B82F6"];

    const series = d3.stack()
      .keys(keys)
      .offset(d3.stackOffsetWiggle)
      .order(d3.stackOrderNone)(data as any);

    const y = d3.scaleLinear()
      .domain([
        d3.min(series, d => d3.min(d, d => d[0])) || 0,
        d3.max(series, d => d3.max(d, d => d[1])) || 0
      ])
      .range([height - margin.bottom, margin.top]);

    const area = d3.area<any>()
      .x(d => x(new Date(d.data.date)))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveBasis);

    svg.append("g")
      .selectAll("path")
      .data(series)
      .join("path")
      .attr("fill", (_, i) => colors[i])
      .attr("d", area)
      .append("title")
      .text(({ key }) => key);

    // X Axis
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0))
      .call(g => g.select(".domain").remove())
      .attr("class", "text-[10px] text-muted-foreground");

  }, [data]);

  if (isLoading) return <div className="h-64 bg-muted animate-pulse rounded-xl" />;
  if (!data) return null;

  return (
    <div className="bg-card border border-card-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sentiment River</h4>
          <p className="text-[12px] font-bold text-foreground">Emotional Narrative Trajectory</p>
        </div>
        <div className="flex gap-3">
          {["Alarming", "Hopeful"].map((l, i) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${i === 0 ? "bg-red-500" : "bg-blue-500"}`} />
              <span className="text-[9px] font-black uppercase text-muted-foreground">{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          ref={svgRef}
          viewBox="0 0 600 300"
          className="w-full h-auto"
          style={{ maxHeight: "300px" }}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
        <p className="text-[10px] text-muted-foreground leading-relaxed max-w-sm">
          Visualization of aggregate emotional tone across all coverage in this category. 
          The "wiggle" offset helps track relative changes in volume between sentiments.
        </p>
        <div className="text-[9px] font-black uppercase bg-secondary px-2 py-1 rounded text-muted-foreground">
          30 Day Trend
        </div>
      </div>
    </div>
  );
}
