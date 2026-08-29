"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const CHUSEOK_DATE = new Date("2026-09-24T00:00:00+09:00");

function getDday() {
  const diff = CHUSEOK_DATE.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const CHUSEOK_ITEMS = [
  { emoji: "🦀", name: "활 숯꽃게", href: "/category/fish" },
  { emoji: "🦐", name: "활새우", href: "/category/fish" },
  { emoji: "🍎", name: "사과", href: "/product/p1" },
];

const AUTO_MS = 4500;

export default function HomeCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [dday, setDday] = useState<number | null>(null);
  const slideCount = 2;

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
  }, []);

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
        {/* 슬라이드 1: 브랜드 히어로 */}
        <section className="relative w-full shrink-0 snap-center overflow-hidden bg-gradient-to-br from-brand-light via-emerald-50 to-lime-50">
          <div className="absolute -top-6 -left-8 w-32 h-32 rounded-full bg-brand/20 blur-2xl animate-blob" />
          <div className="absolute top-10 right-0 w-24 h-24 rounded-full bg-accent/20 blur-2xl animate-blob" style={{ animationDelay: "2s" }} />
          <div className="relative px-4 py-8 flex items-center gap-4 min-h-[196px]">
            <div className="flex-1 animate-pop-in">
              <p className="text-brand-dark font-semibold text-sm mb-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                농가에서 바로, 바로산지
              </p>
              <h1 className="text-xl font-extrabold text-gray-900 leading-snug">
                중간 유통 없이,
                <br />
                농가에서 댁까지 바로 배송
              </h1>
              <Link
                href="/category/direct"
                className="inline-block mt-4 bg-gradient-to-r from-brand to-brand-dark text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-md shadow-brand/30 active:scale-95 transition"
              >
                산지직송 상품 보기 →
              </Link>
            </div>
            <div className="text-6xl select-none shrink-0 animate-float drop-shadow-lg">🚜</div>
          </div>
        </section>

        {/* 슬라이드 2: 추석 예약주문 */}
        <section className="relative w-full shrink-0 snap-center overflow-hidden bg-gradient-to-br from-rose-900 via-red-800 to-amber-700">
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-amber-200/25 blur-md" />
          <span className="absolute top-3 right-4 text-4xl opacity-90 drop-shadow">🌕</span>
          <div className="relative px-4 py-5 min-h-[196px]">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-amber-900 bg-amber-300 px-2 py-0.5 rounded-full animate-badge-pulse">
                추석 예약주문
              </span>
              {dday !== null && dday > 0 && (
                <span className="text-[11px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full tabular-nums">
                  D-{dday}
                </span>
              )}
            </div>
            <h2 className="text-lg font-extrabold text-white leading-snug mb-0.5">
              풍성한 한가위, 산지에서 바로
            </h2>
            <p className="text-xs text-amber-100 mb-4">
              추석 선물세트, 미리 예약하고 신선하게 받아보세요
            </p>
            <div className="grid grid-cols-3 gap-2">
              {CHUSEOK_ITEMS.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="card-tap flex flex-col items-center gap-1 bg-white/95 rounded-xl px-2 py-2.5 text-center shadow-sm"
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-[11px] font-bold text-gray-900">{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {Array.from({ length: slideCount }).map((_, i) => (
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
