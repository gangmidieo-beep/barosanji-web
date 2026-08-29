"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const CHUSEOK_DATE = new Date("2026-09-24T00:00:00+09:00");

function getDday() {
  const diff = CHUSEOK_DATE.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function pct(price: number, originalPrice: number) {
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

// 추석 예약주문 품목 배너 — 실제 상품 등록 전까지의 예시 가격입니다. 상품이 등록되면 실제 가격/링크로 교체하면 됩니다.
const PROMO_ITEMS = [
  {
    photo: "/images/banner/seonmulset.jpg",
    emoji: "🎁",
    label: "★추석 선물세트★",
    name: "명절 과일 선물세트",
    price: 39900,
    originalPrice: 56900,
    href: "/category/event",
    from: "from-red-700",
    via: "via-rose-600",
    to: "to-orange-600",
  },
  {
    photo: "/images/banner/hwal-saeu.jpg",
    emoji: "🦐",
    label: "★산지직송★",
    name: "활새우 (1kg)",
    price: 32900,
    originalPrice: 41100,
    href: "/category/fish",
    from: "from-orange-600",
    via: "via-amber-500",
    to: "to-rose-500",
  },
  {
    photo: "/images/banner/apple.jpg",
    emoji: "🍎",
    label: "★한가위 선물★",
    name: "경북 청송 꿀사과 (5kg)",
    price: 23900,
    originalPrice: 32000,
    href: "/product/p1",
    from: "from-rose-600",
    via: "via-red-500",
    to: "to-amber-500",
  },
  {
    photo: "/images/banner/goguma.jpg",
    emoji: "🍠",
    label: "★가을 특가★",
    name: "해남 꿀고구마 (5kg)",
    price: 18900,
    originalPrice: 24900,
    href: "/category/vegetable",
    from: "from-amber-700",
    via: "via-orange-600",
    to: "to-rose-600",
  },
];

const AUTO_MS = 3800;

export default function HomeCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [dday, setDday] = useState<number | null>(null);
  const slideCount = PROMO_ITEMS.length;

  useEffect(() => {
    setDday(getDday());
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % slideCount;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [slideCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none"
      >
        {PROMO_ITEMS.map((item) => {
          const discount = pct(item.price, item.originalPrice);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative w-full shrink-0 snap-center overflow-hidden bg-gradient-to-br ${item.from} ${item.via} ${item.to} block`}
            >
              {item.photo && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.photo}
                    alt={item.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-black/10" />
                </>
              )}

              <div className="relative min-h-[220px] px-4 py-4 flex items-center">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-amber-200 font-extrabold text-sm mb-1.5 drop-shadow">{item.label}</p>
                  <h2 className="text-white font-extrabold text-xl leading-snug mb-3 drop-shadow">
                    {item.name}
                  </h2>
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-yellow-300 font-extrabold text-2xl drop-shadow">
                      {item.price.toLocaleString()}원
                    </span>
                  </p>
                  <p className="text-white/70 text-xs line-through mt-0.5">
                    {item.originalPrice.toLocaleString()}원
                  </p>
                </div>

                {!item.photo && (
                  <div className="relative shrink-0 w-32 h-32 flex items-center justify-center">
                    <span className="text-7xl drop-shadow-xl animate-float">{item.emoji}</span>
                  </div>
                )}
                <span
                  className={`absolute ${
                    item.photo ? "bottom-4 right-4" : "-bottom-1 -right-1"
                  } w-14 h-14 rounded-full bg-red-600 border-2 border-white/80 flex flex-col items-center justify-center leading-none shadow-lg z-10`}
                >
                  <span className="text-white font-extrabold text-base">{discount}%</span>
                  <span className="text-white/90 text-[9px] font-semibold">할인</span>
                </span>
              </div>

              <span className="absolute top-3 right-3 z-20 bg-black/40 backdrop-blur text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                {PROMO_ITEMS.indexOf(item) + 1} | {slideCount} 모두보기
              </span>
              {dday !== null && dday > 0 && (
                <span className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur text-red-700 text-[11px] font-extrabold px-2.5 py-1 rounded-full">
                  추석 D-{dday}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {PROMO_ITEMS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
