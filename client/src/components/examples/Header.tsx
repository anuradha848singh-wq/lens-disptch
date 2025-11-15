import { Header } from "../Header";
import { ThemeProvider } from "../ThemeProvider";

export default function HeaderExample() {
  return (
    <ThemeProvider>
      <Header onSearch={(query) => console.log("Search:", query)} />
      <div className="p-8">
        <p className="text-sm text-muted-foreground">
          The header includes logo, search bar, theme toggle, and user menu.
        </p>
      </div>
    </ThemeProvider>
  );
}
