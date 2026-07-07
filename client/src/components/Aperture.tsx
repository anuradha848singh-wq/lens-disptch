import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ApertureProps {
  sources: { lean: "left" | "center" | "right" | "unrated" }[];
  diversityScore: number; // 0-100
  size?: "inline" | "feature" | "fallback";
  className?: string;
}

export const Aperture = React.memo(function Aperture({ sources, diversityScore, size = "inline", className }: ApertureProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mediaQuery.matches) {
      setShouldAnimate(true);
    }
  }, []);

  const dimensions = size === "inline" || size === "fallback" ? 24 : 48;
  const strokeWidth = 1.5;

  const { paths, r, cx, cy } = useMemo(() => {
    const n = Math.min(Math.max(sources.length, 1), 8); // Cap at 8 for legibility
    const openPct = Math.max(0, Math.min(100, diversityScore || 0));
    const cx = dimensions / 2;
    const cy = dimensions / 2;
    const R = dimensions / 2 - 2;
    
    // R_in (opening radius) = 3 + (diversityPct / 100) * (R_out * 0.72)
    const r = 3 + (openPct / 100) * (R * 0.72);
    
    if (size === "fallback") {
      // Fallback is just a single ring, no blades. We'll return empty paths and handle it in render.
      return { paths: [], r, cx, cy, R };
    }

    const gap = Math.max(4, (360 / n) * 0.14);
    const slice = 360 / n;
    const toRad = (d: number) => (d - 90) * Math.PI / 180;
    
    const pathsData = [];
    
    for (let i = 0; i < n; i++) {
      const source = sources[i] || { lean: "center" };
      let fill = "var(--ink-muted)";
      let opacity = 0.4;
      
      if (source.lean === "left") {
        fill = "var(--wire-blue)";
        opacity = 1;
      } else if (source.lean === "right") {
        fill = "var(--wire-red)";
        opacity = 1;
      }
      
      const a1 = i * slice + gap / 2;
      const a2 = (i + 1) * slice - gap / 2;
      
      const x1o = cx + R * Math.cos(toRad(a1));
      const y1o = cy + R * Math.sin(toRad(a1));
      const x2o = cx + R * Math.cos(toRad(a2));
      const y2o = cy + R * Math.sin(toRad(a2));
      
      const x1i = cx + r * Math.cos(toRad(a2));
      const y1i = cy + r * Math.sin(toRad(a2));
      const x2i = cx + r * Math.cos(toRad(a1));
      const y2i = cy + r * Math.sin(toRad(a1));
      
      const large = (a2 - a1) > 180 ? 1 : 0;
      
      const d = `M ${x1o} ${y1o} A ${R} ${R} 0 ${large} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${r} ${r} 0 ${large} 0 ${x2i} ${y2i} Z`;
      pathsData.push({ d, fill, opacity });
    }
    
    return { paths: pathsData, r, cx, cy, R };
  }, [sources, diversityScore, size, dimensions]);

  const fallbackCircumference = 2 * Math.PI * (dimensions / 2 - 2);
  const fallbackDashArray = `${((diversityScore || 0) / 100) * fallbackCircumference} ${fallbackCircumference}`;

  const renderContent = () => (
    <svg 
      width={dimensions} 
      height={dimensions} 
      viewBox={`0 0 ${dimensions} ${dimensions}`}
      className={cn("shrink-0", className)}
      aria-label={`${Math.round(diversityScore || 0)}% diverse, ${sources.length} sources`}
      role="img"
    >
      {size === "fallback" ? (
        <>
          <circle cx={cx} cy={cy} r={dimensions / 2 - 2} fill="none" stroke="var(--hairline)" strokeWidth={strokeWidth} />
          <circle 
            cx={cx} 
            cy={cy} 
            r={dimensions / 2 - 2} 
            fill="none" 
            stroke="var(--signal-yellow)" 
            strokeWidth={strokeWidth * 1.5} 
            strokeDasharray={fallbackDashArray}
            strokeDashoffset="0"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </>
      ) : (
        <>
          {/* Blades */}
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill={p.fill} style={{ opacity: p.opacity }} />
          ))}
          {/* Inner signal ring */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--signal-yellow)" strokeWidth={strokeWidth} />
        </>
      )}
    </svg>
  );

  if (shouldAnimate) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.55 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "50px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="inline-flex items-center justify-center"
      >
        {renderContent()}
      </motion.div>
    );
  }

  return <div className="inline-flex items-center justify-center">{renderContent()}</div>;
});
