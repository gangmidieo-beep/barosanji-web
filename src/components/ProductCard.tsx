"use client";

import Link from "next/link";
import { Product, getThumbnails, isImageUrl, formatOrigin } from "@/lib/data";
import StarRating from "./StarRating";
import TodayDispatchCountdown from "./TodayDispatchCountdown";

const badgeStyle: Record<string, string> = {
  타임특가: "bg-gradient-to-r from-accent to-orange-500 text-white animate-badge-pulse",
  한정수량: "bg-gradient-to-r from-red-500 to-rose-500 text-white",
  산지직송: "bg-gradient-to-r from-brand to-brand-dark text-white",
  신상품: "bg-gradient-to-r from-blue-500 to-sky-500 text-white",
};

export default function ProductCard({ product }: { product: Product }) {
  const discount = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );
  const thumbnail = getThumbnails(product)[0];

  return (
    <Link
      href={`/product/${product.id}`}
      className="card-tap group block rounded-2xl border border-gray-100 hover:border-brand/40 hover:shadow-lg shadow-sm transition overflow-hidden bg-white"
    >
      <div className="glow-image relative aspect-square bg-gradient-to-br from-brand-light to-emerald-50 flex items-center justify-center text-6xl overflow-hidden">
        {/* 기본 배경 이모지 — 이미지가 없거나 로딩 실패 시 보인다 */}
        <span
          className={`relative z-0 transition-transform duration-300 drop-shadow-sm ${
            product.soldOut ? "grayscale opacity-60" : "group-hover:scale-110"
          }`}
        >
          {isImageUrl(thumbnail) ? "🥬" : thumbnail}
        </span>
        {isImageUrl(thumbnail) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            className={`absolute inset-0 z-10 w-full h-full object-cover transition-transform duration-300 ${
              product.soldOut ? "grayscale opacity-60" : "group-hover:scale-110"
            }`}
          />
        )}
        {product.soldOut && (
          <span className="absolute inset-0 z-20 flex items-center justify-center">
            <span className="border-4 border-white/90 text-white font-extrabold text-lg px-4 py-1.5 rounded-lg bg-black/60 -rotate-12">
              품절
            </span>
          </span>
        )}
        {!product.soldOut && product.badge && (
          <span
            className={`absolute top-2 left-2 z-10 text-[11px] px-2 py-0.5 rounded-full font-semibold shadow-sm ${badgeStyle[product.badge]}`}
          >
            {product.badge}
          </span>
        )}
        {!product.soldOut && discount >= 20 && (
          <span className="absolute top-2 right-2 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex flex-col items-center justify-center leading-none shadow-sm">
            <span className="text-[10px] font-bold text-accent">{discount}%</span>
            <span className="text-[7px] text-gray-400">할인</span>
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-[11px] text-brand-dark font-medium mb-1">{formatOrigin(product)}</p>
        <p className="text-sm font-medium text-gray-800 line-clamp-2">
          {product.name}
        </p>
        {product.soldOut ? (
          <p className="text-[11px] text-red-500 font-semibold mt-1">일시 품절 · 재입고 예정</p>
        ) : (
          <TodayDispatchCountdown />
        )}
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-accent font-bold text-sm">{discount}%</span>
          <span className="font-extrabold text-gray-900">{product.price.toLocaleString()}원</span>
        </div>
        <p className="text-xs text-gray-400 line-through">
          {product.originalPrice.toLocaleString()}원
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <StarRating rating={product.rating} />
          <span className="text-[11px] text-gray-500">
            {product.rating} ({product.reviewCount.toLocaleString()})
          </span>
        </div>
      </div>
    </Link>
  );
}
