import { ThemeProvider } from "../ThemeProvider";
import { Button } from "@/components/ui/button";
import { useTheme } from "../ThemeProvider";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold">Theme Provider Example</h2>
      <p>Current theme: {theme}</p>
      <Button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        Toggle Theme
      </Button>
    </div>
  );
}

export default function ThemeProviderExample() {
  return (
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
}
