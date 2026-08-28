import { categories, getProductsByCategory } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const items = getProductsByCategory(slug);

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold mb-1 flex items-center gap-2">
        <span>{category.icon}</span>
        {category.name}
      </h1>
      <p className="text-sm text-gray-500 mb-4">총 {items.length}개 상품</p>
      {items.length === 0 ? (
        <p className="text-gray-400 py-20 text-center">등록된 상품이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
