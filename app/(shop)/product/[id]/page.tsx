import { getThumbnails } from "@/lib/data";
import { getVisibleProductById } from "@/lib/db-products";
import { notFound } from "next/navigation";
import ProductActions from "./ProductActions";
import ProductGallery from "@/components/ProductGallery";
import StarRating from "@/components/StarRating";

const badgeStyle: Record<string, string> = {
  타임특가: "bg-gradient-to-r from-accent to-orange-500 text-white animate-badge-pulse",
  한정수량: "bg-gradient-to-r from-red-500 to-rose-500 text-white",
  산지직송: "bg-gradient-to-r from-brand to-brand-dark text-white",
  신상품: "bg-gradient-to-r from-blue-500 to-sky-500 text-white",
};

// 상품이 DB에서 실시간으로 바뀌므로(관리자 등록/수정/노출) 빌드 시점에 미리 만들지 않고 매번 새로 조회
export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getVisibleProductById(id);
  if (!product) notFound();

  const discount = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  return (
    <div className="pb-8">
      <ProductGallery
        images={getThumbnails(product)}
        badge={product.badge}
        badgeClass={product.badge ? badgeStyle[product.badge] : undefined}
      />

      <div className="px-4 pt-4 animate-pop-in">
        <p className="text-sm text-brand-dark font-semibold mb-1">
          {product.region} · {product.farm}
        </p>
        <h1 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h1>
        <div className="flex items-center gap-1.5 mb-4">
          <StarRating rating={product.rating} size="md" />
          <span className="text-sm text-gray-500">
            {product.rating} · 후기 {product.reviewCount.toLocaleString()}개
          </span>
        </div>

        <div className="border-t border-b border-gray-100 py-4 mb-4">
          <p className="text-gray-400 line-through text-sm">
            {product.originalPrice.toLocaleString()}원
          </p>
          <p className="flex items-baseline gap-2">
            <span className="text-accent font-bold text-xl">{discount}%</span>
            <span className="text-2xl font-extrabold text-gray-900">
              {product.price.toLocaleString()}원
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-1">기본 단위: {product.unit}</p>
        </div>

        <p className="text-sm text-gray-700 leading-relaxed mb-6">{product.description}</p>

        <div className="bg-gradient-to-br from-brand-light/60 to-white rounded-xl p-4 text-xs text-gray-600 mb-6 space-y-1.5 border border-brand-light">
          <p>📦 본 상품은 <b className="text-gray-700">{product.farm}</b>에서 주문 확인 후 직접 발송합니다.</p>
          <p>🚚 산지 사정에 따라 출고까지 1~3일 소요될 수 있습니다.</p>
          <p>🙋 상품/배송 문의는 고객센터(1588-0000)로 연락 주세요.</p>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-5">
          <div className="flex gap-5 text-sm font-medium text-gray-400 border-b border-gray-100 mb-4">
            <span className="pb-3 border-b-2 border-brand text-brand-dark">상세정보</span>
            <span className="pb-3">상품문의 (0)</span>
            <span className="pb-3">구매후기 ({product.reviewCount.toLocaleString()})</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {product.farm}({product.region})에서 재배·생산한 상품으로, 중간 유통 단계 없이
            산지에서 고객님께 직접 배송됩니다.
          </p>
          {product.detailImages && product.detailImages.length > 0 ? (
            <div className="-mx-4 space-y-1">
              {product.detailImages.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt={`${product.name} 상세 이미지 ${i + 1}`}
                  className="w-full block"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">상세 이미지는 준비 중입니다.</p>
          )}
        </div>
      </div>

      <ProductActions product={product} />
    </div>
  );
}
