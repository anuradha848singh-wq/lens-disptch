import { useState, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Moon, Sun, LayoutDashboard, LogOut, ShieldCheck, Settings, Menu, X, BookmarkIcon, Clock, Eye, Globe, ChevronDown } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "./AuthModal";
import { useQuery } from "@tanstack/react-query";
import { useCountryProfile } from "@/hooks/useCountryProfile";

interface MainNavProps {
  onSearch?: (q: string) => void;
  searchQuery?: string;
}

export function MainNav({ onSearch = () => {}, searchQuery = "" }: MainNavProps) {
  const { theme, setTheme } = useTheme();
  const { user, profile, logout, isLoading: authLoading } = useAuth();
  const [location] = useLocation();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: lean } = useQuery({
    queryKey: ['/api/homepage/lean'],
    queryFn: () => fetch('/api/homepage/lean').then(r => r.json()),
    staleTime: 5 * 60 * 1000,
    placeholderData: { leftPct: 42, centerPct: 35, rightPct: 23 }
  });

  const debouncedSearch = useCallback((val: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(val), 300);
  }, [onSearch]);

  const openAuth = (mode: "login" | "register") => { setAuthMode(mode); setAuthOpen(true); };

  const { countryCode, setCountryCode } = useCountryProfile();
  const [editionOpen, setEditionOpen] = useState(false);

  const EDITIONS = [
    { code: "GLOBAL", label: "World",  flag: "🌍" },
    { code: "US",     label: "US",     flag: "🇺🇸" },
    { code: "UK",     label: "UK",     flag: "🇬🇧" },
    { code: "IN",     label: "India",  flag: "🇮🇳" },
    { code: "AU",     label: "Aus",    flag: "🇦🇺" },
    { code: "CA",     label: "Canada", flag: "🇨🇦" },
    { code: "DE",     label: "Germany",flag: "🇩🇪" },
  ];
  const currentEdition = EDITIONS.find(e => e.code === countryCode) ?? EDITIONS[0];

  const tabs = [
    { label: "Home", href: "/" },
    { label: "For You", href: "/for-you" },
    { label: "Factuality", href: "/factuality" },
    { label: "Blindspot", href: "/blindspot" },
    { label: "My Bias", href: "/my-bias" },
    { label: "History", href: "/history" },
    { label: "Publishers", href: "/publishers" },
  ];

  const userInitials = profile?.displayName
    ? profile.displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? "U").toUpperCase();

  return (
    <>
      {/* 1. Ultra-Compact Header */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50 py-1" data-testid="main-header">
        <div className="max-w-[1500px] mx-auto px-4 flex items-center justify-between h-14">
          {/* Left: Date & Edition */}
          <div className="hidden xl:flex flex-col text-xs font-serif italic text-muted-foreground leading-none">
            <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
            <span className="uppercase not-italic font-bold tracking-tighter mt-1 text-[10px]">International Edition</span>
          </div>

          {/* Mobile: Hamburger */}
          <button
            className="xl:hidden p-2 hover:bg-secondary/50 rounded-full transition-colors"
            onClick={() => setMobileMenuOpen(v => !v)}
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Center: Logo */}
          <Link href="/">
            <div className="cursor-pointer select-none group flex flex-col items-center">
              <h1 className="text-2xl md:text-4xl font-display font-black tracking-[-0.03em] text-foreground leading-none whitespace-nowrap">The Lens</h1>
              <div className="text-[7px] md:text-[8px] tracking-[.45em] uppercase text-accent-editorial font-black -mt-0.5">Dispatch</div>
            </div>
          </Link>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2 hover:bg-secondary/50 rounded-full transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <div className="h-4 w-px bg-border mx-1 hidden md:block" />

            {!authLoading && (
              user ? (
                /* ── Logged-in user dropdown ── */
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none">
                      <Avatar className="w-8 h-8 border-2 border-accent-editorial">
                        <AvatarFallback className="bg-accent-editorial text-white text-xs font-black">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden md:block text-xs font-bold text-foreground max-w-[100px] truncate">
                        {profile?.displayName || user.email?.split("@")[0]}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 shadow-lg">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-xs font-bold text-foreground truncate">{profile?.displayName || "Reader"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/bookmarks">
                        <span className="flex items-center gap-2 w-full cursor-pointer">
                          <BookmarkIcon className="w-3.5 h-3.5" /> Bookmarks
                        </span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/history">
                        <span className="flex items-center gap-2 w-full cursor-pointer">
                          <Clock className="w-3.5 h-3.5" /> Reading History
                        </span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/my-bias">
                        <span className="flex items-center gap-2 w-full cursor-pointer">
                          <Eye className="w-3.5 h-3.5" /> My Bias Profile
                        </span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <span className="flex items-center gap-2 w-full cursor-pointer">
                          <Settings className="w-3.5 h-3.5" /> Settings
                        </span>
                      </Link>
                    </DropdownMenuItem>
                    {(user?.role === "admin" || user?.role === "editor") && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin">
                            <span className="flex items-center gap-2 w-full cursor-pointer">
                              <ShieldCheck className="w-3.5 h-3.5" /> Admin Panel
                            </span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard">
                            <span className="flex items-center gap-2 w-full cursor-pointer">
                              <LayoutDashboard className="w-3.5 h-3.5" /> Editor Dashboard
                            </span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => logout()}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                /* ── Guest buttons ── */
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 text-[11px] font-bold uppercase tracking-widest px-3 hidden md:flex" onClick={() => openAuth("login")}>Login</Button>
                  <Button size="sm" className="h-8 text-[11px] font-bold uppercase tracking-widest px-4 bg-accent-editorial hover:bg-accent-editorial/90 text-white" onClick={() => openAuth("register")}>Subscribe</Button>
                </div>
              )
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <nav
            className="absolute top-0 left-0 bottom-0 w-72 bg-background border-r border-border shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="font-display font-black text-lg sm:text-xl">The Lens Dispatch</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              {tabs.map((tab) => (
                <Link key={tab.href} href={tab.href}>
                  <div
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-6 py-3 text-sm font-bold uppercase tracking-widest cursor-pointer transition-colors ${
                      location === tab.href
                        ? "text-accent-editorial bg-accent-editorial/5 border-l-2 border-accent-editorial"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                    }`}
                  >
                    {tab.label}
                  </div>
                </Link>
              ))}
              {/* Edition selector in mobile drawer */}
              <div className="px-6 pt-4 pb-2 border-t border-border/40 mt-2">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Edition
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {EDITIONS.map(ed => (
                    <button
                      key={ed.code}
                      onClick={() => { setCountryCode(ed.code); setMobileMenuOpen(false); }}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-all ${
                        ed.code === countryCode
                          ? "border-accent-editorial bg-accent-editorial/5 text-accent-editorial"
                          : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                      }`}
                    >
                      <span className="text-xl">{ed.flag}</span>
                      <span className="text-[9px] font-black uppercase tracking-wider">{ed.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {!user && (
              <div className="p-4 border-t border-border space-y-2">
                <Button className="w-full bg-accent-editorial text-white hover:bg-accent-editorial/90 font-black text-xs uppercase tracking-widest" onClick={() => { openAuth("register"); setMobileMenuOpen(false); }}>
                  Subscribe Free
                </Button>
                <Button variant="outline" className="w-full font-black text-xs uppercase tracking-widest" onClick={() => { openAuth("login"); setMobileMenuOpen(false); }}>
                  Sign In
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}

      {/* 2. Desktop Navigation Row */}
      <nav className="bg-background border-b border-border py-1 hidden xl:block" data-testid="main-nav">
        <div className="max-w-[1500px] mx-auto px-4 flex items-center justify-between gap-8">
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide py-1">
            {tabs.map((tab) => (
              <Link key={tab.href} href={tab.href}>
                <span className={`text-xs font-bold uppercase tracking-widest cursor-pointer whitespace-nowrap hover:text-accent-editorial transition-colors flex items-center gap-2 ${location === tab.href ? "text-accent-editorial underline underline-offset-8 decoration-2" : "text-muted-foreground"}`}>
                  {tab.label === "Home" && <span className="w-1.5 h-1.5 rounded-full bg-accent-editorial animate-pulse" />}
                  {tab.label}
                </span>
              </Link>
            ))}
          </div>

          {/* Edition Switcher */}
          <div className="relative hidden lg:block" id="edition-switcher">
            <button
              onClick={() => setEditionOpen(v => !v)}
              className="flex items-center gap-2 py-1.5 px-3.5 bg-secondary/30 rounded-full border border-border/50 hover:bg-secondary/60 cursor-pointer transition-colors"
              aria-label="Switch edition"
              aria-expanded={editionOpen}
            >
              <span className="text-base leading-none">{currentEdition.flag}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{currentEdition.label}</span>
              <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${editionOpen ? "rotate-180" : ""}`} />
            </button>
            {editionOpen && (
              <div className="absolute top-full left-0 mt-2 z-50 bg-card border border-border rounded-xl shadow-xl py-1.5 min-w-[160px] animate-fade-in-up">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground px-3 py-1.5">
                  Edition
                </p>
                {EDITIONS.map(ed => (
                  <button
                    key={ed.code}
                    onClick={() => { setCountryCode(ed.code); setEditionOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-secondary/60 transition-colors ${
                      ed.code === countryCode ? "bg-accent-editorial/5 text-accent-editorial" : "text-foreground"
                    }`}
                  >
                    <span className="text-base">{ed.flag}</span>
                    <span className="text-[12px] font-bold">{ed.label}</span>
                    {ed.code === countryCode && <span className="ml-auto text-accent-editorial text-[10px] font-black">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live Coverage Lean */}
          <Link href="/blindspot">
            <div className="hidden xl:flex items-center gap-3 py-1 px-4 bg-secondary/30 rounded-full border border-border/50 hover:bg-secondary/60 cursor-pointer transition-colors">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Today's Lean</span>
              <div className="flex w-24 h-1.5 rounded-full overflow-hidden bg-border/30">
                <div className="bias-left h-full" style={{ width: `${lean?.leftPct ?? 42}%` }} />
                <div className="bias-center h-full" style={{ width: `${lean?.centerPct ?? 35}%` }} />
                <div className="bias-right h-full" style={{ width: `${lean?.rightPct ?? 23}%` }} />
              </div>
              <span className="text-[10px] font-bold text-foreground">{lean?.leftPct ?? 42}L·{lean?.rightPct ?? 23}R</span>
            </div>
          </Link>

          <div className="flex items-center gap-2 max-w-[240px] flex-1 ml-auto py-1">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search stories, topics, publishers..."
                className="h-8 text-xs pl-9 pr-8 bg-muted/40 border-border rounded-lg focus-visible:ring-1 focus-visible:ring-accent-editorial/30"
                value={localQuery}
                onChange={(e) => {
                  setLocalQuery(e.target.value);
                  debouncedSearch(e.target.value);
                }}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground opacity-50 px-1 border border-border rounded hidden md:block">⌘K</span>
            </div>
          </div>
        </div>
      </nav>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultMode={authMode} />
    </>
  );
}
