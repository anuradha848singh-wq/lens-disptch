import { SearchBar } from "../SearchBar";

export default function SearchBarExample() {
  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Search Bar Example</h2>
      <SearchBar onSearch={(query) => console.log("Search:", query)} />
    </div>
  );
}
