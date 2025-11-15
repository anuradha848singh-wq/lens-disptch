import { Button } from "@/components/ui/button";
import { Moon, Sun, Menu, User } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { SearchBar } from "./SearchBar";
import { Link } from "wouter";

interface HeaderProps {
  onSearch: (query: string) => void;
}

export function Header({ onSearch }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              data-testid="button-menu"
              onClick={() => console.log("Menu clicked")}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Link href="/">
              <h1 className="text-2xl font-bold cursor-pointer" data-testid="text-logo">
                NewsHub
              </h1>
            </Link>
          </div>

          <div className="hidden md:flex flex-1 justify-center max-w-2xl mx-8">
            <SearchBar onSearch={onSearch} />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              data-testid="button-theme-toggle"
            >
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-user-menu"
              onClick={() => console.log("User menu clicked")}
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="md:hidden pb-4">
          <SearchBar onSearch={onSearch} />
        </div>
      </div>
    </header>
  );
}
