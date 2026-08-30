import { getVisibleProductsForList } from "@/lib/db-products";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const products = q ? await getVisibleProductsForList() : [];
  const results = q
    ? products.filter(
        (p) =>
          p.name.includes(q) ||
          p.farm.includes(q) ||
          p.region.includes(q) ||
          p.category.includes(q)
      )
    : [];

  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-bold mb-1">
        &apos;{q}&apos; 검색결과 ({results.length})
      </h1>
      {results.length === 0 ? (
        <p className="text-gray-400 py-20 text-center">검색 결과가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
