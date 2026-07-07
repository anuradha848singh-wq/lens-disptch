import { useState, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Moon, Sun, LayoutDashboard, LogOut, ShieldCheck, Settings, BookmarkIcon, Clock, Eye } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "./AuthModal";
import { useCountryProfile } from "@/hooks/useCountryProfile";
import { cn } from "@/lib/utils";

import { CategoryStrip } from "./CategoryStrip";

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
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const { countryCode } = useCountryProfile();

  const debouncedSearch = useCallback((val: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(val), 300);
  }, [onSearch]);

  const openAuth = (mode: "login" | "register") => { setAuthMode(mode); setAuthOpen(true); };

  const tabs = [
    { label: "HOME", href: "/" },
    { label: "FOR YOU", href: "/for-you" },
    { label: "FACTUALITY", href: "/factuality" },
    { label: "BLINDSPOT", href: "/blindspot" },
    { label: "MY BIAS", href: "/my-bias" },
  ];

  const userInitials = profile?.displayName
    ? profile.displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? "U").toUpperCase();

  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase();

  const isFeedPage = location === "/" || location === "/for-you";

  return (
    <>
      <header className="bg-paper sticky top-0 z-50 flex flex-col border-b border-border">
        {/* Top Row: Dateline, Logo, Login */}
        <div className="flex items-center justify-between px-4 py-2 text-mono-metadata text-ink">
          <div className="flex-1">
            <span className="uppercase">{dateStr} &middot; {countryCode || 'GLOBAL'}</span>
          </div>
          
          <Link href="/">
            <div className="cursor-pointer font-serif font-semibold text-2xl uppercase tracking-widest hover:text-signal-yellow transition-colors">
              The Lens Dispatch
            </div>
          </Link>

          <div className="flex-1 flex justify-end items-center gap-4">
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="hover:text-signal-yellow transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {!authLoading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 hover:text-signal-yellow transition-colors focus:outline-none">
                      <span className="uppercase tracking-widest">{profile?.displayName || user.email?.split("@")[0]}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-none border-border shadow-none">
                    <DropdownMenuItem asChild>
                      <Link href="/bookmarks"><span className="cursor-pointer w-full uppercase font-mono text-[11px]">Bookmarks</span></Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/history"><span className="cursor-pointer w-full uppercase font-mono text-[11px]">History</span></Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/my-bias"><span className="cursor-pointer w-full uppercase font-mono text-[11px]">My Bias</span></Link>
                    </DropdownMenuItem>
                    {user?.role === "admin" && (
                      <>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem asChild>
                          <Link href="/admin"><span className="cursor-pointer w-full uppercase font-mono text-[11px] text-green-600 font-bold">Admin Center</span></Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem onClick={() => logout()} className="text-wire-red uppercase font-mono text-[11px] cursor-pointer">
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button className="uppercase tracking-widest hover:text-signal-yellow transition-colors" onClick={() => openAuth("login")}>
                  LOGIN
                </button>
              )
            )}
          </div>
        </div>

        {/* Nav Row: Tabs, Search */}
        <div className="border-y border-border px-4 py-2 flex items-center justify-between bg-card-surface">
          <nav className="flex gap-6">
            {tabs.map(t => (
              <Link key={t.href} href={t.href}>
                <span className={cn(
                  "cursor-pointer text-mono-metadata hover:text-signal-yellow transition-colors",
                  location === t.href ? "text-ink font-bold" : "text-muted-foreground"
                )}>
                  {t.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 text-mono-metadata text-muted-foreground">
            <Search className="w-3 h-3" />
            <input 
              className="bg-transparent border-none outline-none text-ink placeholder:text-muted-foreground w-32 focus:w-48 transition-all"
              placeholder="SEARCH..."
              value={localQuery}
              onChange={(e) => {
                setLocalQuery(e.target.value);
                debouncedSearch(e.target.value);
              }}
            />
          </div>
        </div>

        {/* Dynamic Category Nav Row */}
        {isFeedPage && <CategoryStrip />}
      </header>
      
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultMode={authMode} />
    </>
  );
}
