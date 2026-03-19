import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Moon, Sun, X, LayoutDashboard, LogOut, ShieldCheck, ChevronDown, Bell, Globe, Settings } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "./AuthModal";

interface MainNavProps {
  onSearch: (q: string) => void;
  searchQuery: string;
}

export function MainNav({ onSearch, searchQuery }: MainNavProps) {
  const { theme, setTheme } = useTheme();
  const { user, profile, logout } = useAuth();
  const [location] = useLocation();
  const [showSearch, setShowSearch] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const openAuth = (mode: "login" | "register") => { setAuthMode(mode); setAuthOpen(true); };

  const tabs = [
    { label: "Home", href: "/" },
    { label: "For You", href: "/for-you" },
    { label: "Blindspot", href: "/blindspot" },
    { label: "My Bias", href: "/my-bias" },
    { label: "History", href: "/history" },
    { label: "Publishers", href: "/publishers" },
  ];

  return (
    <>
      {/* Top promo bar */}
      <div className="bg-zinc-900 text-white text-xs py-2 px-4 flex items-center justify-between" data-testid="top-promo">
        <div className="hidden md:flex items-center gap-4 text-zinc-400">
          <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> International Edition</span>
        </div>
        <div className="flex-1 md:flex-none text-center font-medium">
          See every side of every news story.{" "}
          <button
            onClick={() => openAuth("register")}
            className="text-red-400 underline hover:text-red-300 font-semibold"
            data-testid="top-bar-cta"
          >
            Get Started
          </button>
        </div>
        <div className="hidden md:flex items-center gap-3 text-zinc-400">
          <span>Browser Extension</span>
          <span>·</span>
          <span>Light</span>
          <span>·</span>
          <span>Auto</span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="sticky top-0 z-40 bg-background border-b shadow-sm" data-testid="main-nav">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center gap-3 h-12">
            {/* Logo */}
            <Link href="/">
              <span className="flex items-end gap-1 cursor-pointer select-none flex-shrink-0" data-testid="text-logo">
                <span className="font-black text-2xl tracking-[-0.05em] leading-none uppercase">
                  Gro<span className="text-primary">u</span>nd
                </span>
                <span className="text-[10px] font-bold text-muted-foreground leading-none mb-0.5 tracking-wider uppercase">News</span>
              </span>
            </Link>

            {/* Nav tabs */}
            <div className="hidden md:flex items-center border-l border-border ml-1 pl-3">
              {tabs.map((tab) => (
                <Link key={tab.href} href={tab.href}>
                  <span
                    className={`px-3 py-1 text-sm rounded transition-colors cursor-pointer ${
                      location === tab.href
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground hover:text-foreground hover-elevate"
                    } ${location === tab.href ? "border-b-2 border-primary rounded-none" : ""}`}
                    data-testid={`nav-${tab.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {tab.label}
                  </span>
                </Link>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 max-w-xs ml-2">
              {showSearch ? (
                <div className="flex items-center gap-1 border border-border rounded bg-muted px-2 h-8">
                  <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <Input
                    autoFocus
                    type="search"
                    placeholder="Search stories..."
                    value={searchQuery}
                    onChange={(e) => onSearch(e.target.value)}
                    className="border-0 bg-transparent h-7 text-sm p-0 focus-visible:ring-0"
                    data-testid="input-search"
                  />
                  <button onClick={() => { setShowSearch(false); onSearch(""); }}>
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSearch(true)}
                  className="flex items-center gap-2 border border-border rounded bg-muted px-3 h-8 text-sm text-muted-foreground w-full text-left hover-elevate"
                  data-testid="button-search"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-xs">Search</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="p-2 rounded hover-elevate active-elevate-2 text-muted-foreground hover:text-foreground"
                data-testid="button-theme"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 pl-2 hover-elevate active-elevate-2 rounded" data-testid="button-user-menu">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[11px] bg-primary text-primary-foreground font-bold">
                          {profile?.displayName?.[0] ?? user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium hidden sm:inline">{profile?.displayName?.split(" ")[0]}</span>
                      <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-3 py-2">
                      <p className="font-semibold text-sm">{profile?.displayName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard"><span className="flex items-center gap-2 w-full cursor-pointer"><LayoutDashboard className="w-4 h-4" />Editor Dashboard</span></Link>
                    </DropdownMenuItem>
                    {user.role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin"><span className="flex items-center gap-2 w-full cursor-pointer"><ShieldCheck className="w-4 h-4" />Admin Dashboard</span></Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/settings"><span className="flex items-center gap-2 w-full cursor-pointer"><Settings className="w-4 h-4" />Settings</span></Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-sm font-medium"
                    onClick={() => openAuth("login")}
                    data-testid="button-login"
                  >
                    Login
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-sm font-semibold bg-primary hover:bg-primary text-primary-foreground"
                    onClick={() => openAuth("register")}
                    data-testid="button-subscribe"
                  >
                    Subscribe
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultMode={authMode} />
    </>
  );
}
