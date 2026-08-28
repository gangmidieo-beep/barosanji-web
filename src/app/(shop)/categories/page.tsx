import Link from "next/link";
import { categories } from "@/lib/data";

export default function CategoriesPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold mb-5">카테고리</h1>
      <div className="grid grid-cols-3 gap-4">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-brand-light active:scale-95 transition"
          >
            <span className="text-3xl">{c.icon}</span>
            <span className="text-sm font-medium text-gray-700">{c.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
