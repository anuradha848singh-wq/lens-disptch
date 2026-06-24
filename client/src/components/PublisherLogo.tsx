import { useState } from "react";

interface PublisherLogoProps {
  domain?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  xs: { box: "w-5 h-5", text: "text-[8px]", img: 20 },
  sm: { box: "w-7 h-7", text: "text-[10px]", img: 28 },
  md: { box: "w-9 h-9", text: "text-xs", img: 36 },
  lg: { box: "w-12 h-12", text: "text-sm", img: 48 },
};

const NAME_MAP: Record<string, string> = {
  "bbc news": "bbc.com", "bbc news uk": "bbc.co.uk", "bbc": "bbc.com",
  "reuters": "reuters.com", "associated press": "apnews.com", "ap": "apnews.com",
  "cnn": "cnn.com", "new york times": "nytimes.com",
  "washington post": "washingtonpost.com",
  "the guardian": "theguardian.com", "guardian": "theguardian.com",
  "fox news": "foxnews.com",
  "al jazeera": "aljazeera.com",
  "deutsche welle": "dw.com", "dw world": "dw.com", "dw": "dw.com",
  "france 24": "france24.com",
  "financial times": "ft.com",
  "the economist": "economist.com",
  "bloomberg": "bloomberg.com",
  "breitbart": "breitbart.com", "breitbart news": "breitbart.com",
  "daily wire": "dailywire.com",
  "national review": "nationalreview.com",
  "new york post": "nypost.com", "ny post": "nypost.com",
  "propublica": "propublica.org",
  "axios": "axios.com", "politico": "politico.com",
  "npr": "npr.org",
  "the intercept": "theintercept.com",
  "techcrunch": "techcrunch.com",
  "the verge": "theverge.com",
  "wired": "wired.com",
  "ars technica": "arstechnica.com",
  "times of india": "timesofindia.indiatimes.com",
  "the hindu": "thehindu.com",
  "hindustan times": "hindustantimes.com",
  "ndtv": "ndtv.com",
  "economic times": "economictimes.indiatimes.com",
  "business standard": "business-standard.com",
  "scmp": "scmp.com", "south china morning post": "scmp.com",
  "the straits times": "straitstimes.com",
  "sydney morning herald": "smh.com.au",
  "national post": "nationalpost.com",
  "the telegraph": "telegraph.co.uk",
  "the independent": "independent.co.uk",
  "euronews": "euronews.com",
  "abc news": "abcnews.go.com",
  "cnbc": "cnbc.com",
  "the atlantic": "theatlantic.com",
  "foreign policy": "foreignpolicy.com",
  "kyiv post": "kyivpost.com",
  "haaretz": "haaretz.com",
  "bangkok post": "bangkokpost.com",
  "livemint": "livemint.com",
  "scroll": "scroll.in",
  "the wire": "thewire.in",
};

function resolveDomain(name: string, domain?: string | null): string {
  if (domain) {
    try {
      const h = domain.includes("://")
        ? new URL(domain).hostname.replace("www.", "")
        : domain.replace("www.", "");
      if (h.includes(".")) return h;
    } catch {}
  }
  return NAME_MAP[name.toLowerCase().trim()] || "";
}

function initialsColor(name: string): string {
  const ramps = [
    "bg-blue-100 text-blue-800",
    "bg-green-100 text-green-800",
    "bg-purple-100 text-purple-800",
    "bg-amber-100 text-amber-800",
    "bg-red-100 text-red-800",
    "bg-teal-100 text-teal-800",
    "bg-pink-100 text-pink-800",
    "bg-indigo-100 text-indigo-800",
  ];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return ramps[Math.abs(h) % ramps.length];
}

export function PublisherLogo({ domain, name, size = "sm", className = "" }: PublisherLogoProps) {
  const { box, text, img } = sizes[size];
  const d = resolveDomain(name, domain);
  const [src, setSrc] = useState<string | null>(
    d ? `https://logo.clearbit.com/${d}` : null
  );
  const [stage, setStage] = useState(0);
  const initials = name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const handleError = () => {
    if (stage === 0 && d) {
      setSrc(`https://icons.duckduckgo.com/ip3/${d}.ico`);
      setStage(1);
    } else if (stage === 1 && d) {
      setSrc(`https://www.google.com/s2/favicons?domain=${d}&sz=64`);
      setStage(2);
    } else {
      setSrc(null);
      setStage(3);
    }
  };

  return (
    <div className={`${box} rounded-full border border-border overflow-hidden flex-shrink-0 bg-white ${className}`}>
      {src && stage < 3 ? (
        <img
          src={src}
          alt={name}
          width={img}
          height={img}
          className="w-full h-full object-cover"
          onError={handleError}
          loading="lazy"
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center font-bold ${text} ${initialsColor(name)}`}>
          {initials}
        </div>
      )}
    </div>
  );
}
