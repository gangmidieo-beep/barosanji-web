"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// 2026년 추석: 9월 24일(목) ~ 9월 26일(토)
const CHUSEOK_DATE = new Date("2026-09-24T00:00:00+09:00");

function getDday() {
  const now = new Date();
  const diff = CHUSEOK_DATE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const CHUSEOK_ITEMS = [
  { emoji: "🦀", name: "활 숯꽃게", note: "알 꽉 찬 산지 직송", href: "/category/fish" },
  { emoji: "🦐", name: "활새우", note: "펄떡이는 활력 그대로", href: "/category/fish" },
  { emoji: "🍎", name: "사과", note: "당도 높은 명절 선물용", href: "/product/p1" },
];

export default function ChuseokBanner() {
  const [dday, setDday] = useState<number | null>(null);

  useEffect(() => {
    setDday(getDday());
  }, []);

  return (
    <section className="px-4 pt-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-900 via-red-800 to-amber-700 px-4 py-5 shadow-lg shadow-red-900/30">
        {/* 배경 장식: 보름달 */}
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-amber-200/25 blur-md" />
        <span className="absolute top-3 right-4 text-4xl opacity-90 drop-shadow">🌕</span>

        <div className="relative">
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
                className="card-tap flex flex-col items-center gap-1 bg-white/95 rounded-xl px-2 py-3 text-center shadow-sm"
              >
                <span className="text-3xl">{item.emoji}</span>
                <span className="text-xs font-bold text-gray-900">{item.name}</span>
                <span className="text-[10px] text-gray-500 leading-tight">{item.note}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
