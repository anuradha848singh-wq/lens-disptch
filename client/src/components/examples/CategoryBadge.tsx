import { CategoryBadge } from "../CategoryBadge";

export default function CategoryBadgeExample() {
  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Category Badge Examples</h2>
      <div className="flex gap-2 flex-wrap">
        <CategoryBadge category="Politics" />
        <CategoryBadge category="Business" />
        <CategoryBadge category="Technology" />
        <CategoryBadge category="Sports" />
        <CategoryBadge category="World" />
      </div>
    </div>
  );
}
