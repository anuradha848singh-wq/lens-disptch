import { useState, useRef, useEffect } from "react";
import { Share2, Copy, Check, Twitter, Mail, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface SharePanelProps {
  articleId: string;
  title: string;
  /** Optional — if omitted, uses window.location.href */
  url?: string;
  /** Render as inline panel instead of dropdown */
  inline?: boolean;
  className?: string;
}

const PLATFORMS = [
  {
    id: "twitter",
    label: "X / Twitter",
    icon: Twitter,
    color: "hover:bg-black/5 dark:hover:bg-white/5",
    action: (url: string, title: string) => {
      window.open(
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
        "_blank",
        "noopener,noreferrer"
      );
    },
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: null,
    emoji: "💬",
    color: "hover:bg-green-50 dark:hover:bg-green-950/30",
    action: (url: string, title: string) => {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
        "_blank",
        "noopener,noreferrer"
      );
    },
  },
  {
    id: "email",
    label: "Email",
    icon: Mail,
    color: "hover:bg-blue-50 dark:hover:bg-blue-950/30",
    action: (url: string, title: string) => {
      window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title}\n\nRead more: ${url}`)}`;
    },
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: null,
    emoji: "👥",
    color: "hover:bg-blue-50 dark:hover:bg-blue-950/30",
    action: (url: string) => {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        "_blank",
        "noopener,noreferrer"
      );
    },
  },
  {
    id: "reddit",
    label: "Reddit",
    icon: null,
    emoji: "🔗",
    color: "hover:bg-orange-50 dark:hover:bg-orange-950/30",
    action: (url: string, title: string) => {
      window.open(
        `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
        "_blank",
        "noopener,noreferrer"
      );
    },
  },
];

export function SharePanel({ articleId, title, url, inline = false, className = "" }: SharePanelProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      // Track share analytics
      api.articles.share(articleId, "copy").catch(() => {});
      toast({ title: "Link copied!", description: "Share it anywhere.", duration: 2000 });
    } catch {
      toast({ title: "Could not copy", description: "Please copy the URL manually.", duration: 2000 });
    }
  };

  const handlePlatform = (platform: (typeof PLATFORMS)[0]) => {
    platform.action(shareUrl, title);
    api.articles.share(articleId, platform.id).catch(() => {});
    setOpen(false);
  };

  const PanelContent = () => (
    <div className="p-3 space-y-1 w-56">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 pb-1">
        Share this story
      </p>

      {/* Copy link row */}
      <button
        onClick={handleCopy}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-colors text-left"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-500 shrink-0" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-foreground">{copied ? "Copied!" : "Copy link"}</p>
          <p className="text-[10px] text-muted-foreground truncate">{shareUrl.replace(/^https?:\/\//, "")}</p>
        </div>
      </button>

      <div className="h-px bg-border/40 my-1" />

      {/* Platform rows */}
      {PLATFORMS.map((p) => (
        <button
          key={p.id}
          onClick={() => handlePlatform(p)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${p.color}`}
        >
          <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[14px]">
            {p.emoji ? (
              p.emoji
            ) : p.icon ? (
              <p.icon className="w-4 h-4 text-muted-foreground" />
            ) : null}
          </span>
          <span className="text-[12px] font-semibold text-foreground">{p.label}</span>
        </button>
      ))}
    </div>
  );

  if (inline) {
    return (
      <div className={`bg-card border border-border rounded-xl overflow-hidden ${className}`}>
        <PanelContent />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={panelRef}>
      <button
        id={`share-btn-${articleId}`}
        aria-label="Share article"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border border-border/60 hover:bg-secondary/60 hover:border-border transition-all text-muted-foreground hover:text-foreground"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-xl shadow-xl min-w-[220px] animate-fade-in-up">
          <div className="flex items-center justify-between px-3 pt-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Share
            </span>
            <button
              onClick={() => setOpen(false)}
              className="p-0.5 hover:bg-secondary rounded"
              aria-label="Close share panel"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <PanelContent />
        </div>
      )}
    </div>
  );
}
