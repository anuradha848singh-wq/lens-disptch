import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Moon, Sun, Menu, X, LayoutDashboard, LogOut, User, ShieldCheck } from "lucide-react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { label: "Home", href: "/" },
    { label: "For You", href: "/for-you" },
    { label: "Blindspot", href: "/blindspot" },
    { label: "Publishers", href: "/publishers" },
    { label: "Bookmarks", href: "/bookmarks" },
  ];

  return (
    <>
      <nav className="sticky top-0 z-40 bg-background border-b" data-testid="main-nav">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4 h-12">
            <button
              className="lg:hidden hover-elevate active-elevate-2 p-1 rounded-md"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/">
              <span className="font-black text-xl tracking-tight cursor-pointer select-none" data-testid="text-logo">
                <span className="text-primary">G</span>ROUND
                <span className="block text-[8px] tracking-[0.3em] text-muted-foreground leading-none -mt-0.5">NEWS</span>
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-1 ml-2">
              {tabs.map((tab) => (
                <Link key={tab.href} href={tab.href}>
                  <span
                    className={`px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors hover-elevate active-elevate-2 ${
                      location === tab.href
                        ? "font-semibold text-foreground bg-secondary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`nav-${tab.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {tab.label}
                  </span>
                </Link>
              ))}
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              {showSearch ? (
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    type="search"
                    placeholder="Search stories..."
                    value={searchQuery}
                    onChange={(e) => onSearch(e.target.value)}
                    className="w-48 h-8 text-sm"
                    data-testid="input-search"
                  />
                  <button
                    onClick={() => { setShowSearch(false); onSearch(""); }}
                    className="hover-elevate active-elevate-2 p-1 rounded-md"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSearch(true)}
                  className="hover-elevate active-elevate-2 p-1.5 rounded-md text-muted-foreground hover:text-foreground"
                  data-testid="button-search"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="hover-elevate active-elevate-2 p-1.5 rounded-md text-muted-foreground hover:text-foreground"
                data-testid="button-theme"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="hover-elevate active-elevate-2 rounded-full" data-testid="button-user-menu">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                          {profile?.displayName?.[0] ?? user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-3 py-2 text-sm">
                      <p className="font-medium">{profile?.displayName}</p>
                      <p className="text-muted-foreground text-xs">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.location.href = "/dashboard"}>
                      <LayoutDashboard className="w-4 h-4 mr-2" />Editor Dashboard
                    </DropdownMenuItem>
                    {user.role === "admin" && (
                      <DropdownMenuItem onClick={() => window.location.href = "/admin"}>
                        <ShieldCheck className="w-4 h-4 mr-2" />Admin Dashboard
                      </DropdownMenuItem>
                    )}
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
                    className="h-8 text-sm"
                    onClick={() => setAuthOpen(true)}
                    data-testid="button-login"
                  >
                    Login
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-sm"
                    onClick={() => setAuthOpen(true)}
                    data-testid="button-subscribe"
                  >
                    Subscribe
                  </Button>
                </div>
              )}
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden border-t py-2 flex flex-col gap-1">
              {tabs.map((tab) => (
                <Link key={tab.href} href={tab.href}>
                  <span
                    className={`block px-3 py-2 text-sm rounded-md cursor-pointer ${
                      location === tab.href ? "font-semibold bg-secondary" : "text-muted-foreground"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {tab.label}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
