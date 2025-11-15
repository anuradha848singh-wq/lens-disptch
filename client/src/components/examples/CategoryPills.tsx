import { CategoryPills } from "../CategoryPills";
import { useState } from "react";

export default function CategoryPillsExample() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categories = ["Politics", "Business", "Technology", "Sports", "World", "Health", "Science"];

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Category Pills Example</h2>
      <CategoryPills
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />
      <p className="text-sm text-muted-foreground">
        Selected: {selectedCategory || "All"}
      </p>
    </div>
  );
}
