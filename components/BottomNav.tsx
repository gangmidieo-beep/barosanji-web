"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { usePoints } from "@/lib/points-context";
import { DAILY_QUIZ_LIMIT } from "@/lib/quiz-data";

const tabs = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/categories", label: "카테고리", icon: "📋" },
  { href: "/quiz", label: "퀴즈", icon: "🎯" },
  { href: "/cart", label: "장바구니", icon: "🛒" },
  { href: "/mypage", label: "마이", icon: "🙂" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { totalCount } = useCart();
  const { todayAnsweredIds } = usePoints();
  const quizRemaining = Math.max(0, DAILY_QUIZ_LIMIT - todayAnsweredIds.length);

  return (
    <nav className="sticky bottom-0 z-40 bg-white border-t border-gray-100 flex pb-[env(safe-area-inset-bottom)]">
      {tabs.map((t) => {
        const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative ${
              active ? "text-brand-dark" : "text-gray-400"
            }`}
          >
            <span className={`text-xl leading-none transition-transform ${active ? "scale-110" : ""}`}>{t.icon}</span>
            <span className="text-[11px] font-medium">{t.label}</span>
            {active && (
              <span className="absolute -top-0.5 w-1 h-1 rounded-full bg-brand-dark" />
            )}
            {t.href === "/cart" && totalCount > 0 && (
              <span className="absolute top-1 right-[28%] bg-accent text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center animate-badge-pulse">
                {totalCount}
              </span>
            )}
            {t.href === "/quiz" && quizRemaining > 0 && (
              <span className="absolute top-1 right-[28%] bg-accent text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center animate-badge-pulse">
                {quizRemaining}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
