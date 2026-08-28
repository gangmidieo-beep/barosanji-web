"use client";

import Link from "next/link";
import { usePoints } from "@/lib/points-context";
import { DAILY_QUIZ_LIMIT, REWARD_PER_QUIZ } from "@/lib/quiz-data";

export default function QuizTeaser() {
  const { todayAnsweredIds } = usePoints();
  const completed = todayAnsweredIds.length;
  const remaining = Math.max(0, DAILY_QUIZ_LIMIT - completed);

  return (
    <section className="px-4 pt-5">
      <Link
        href="/quiz"
        className="card-tap flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-100 px-4 py-3.5"
      >
        <span className="text-3xl animate-float">🎯</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">
            오늘의 퀴즈 풀고 적립금 받기
          </p>
          <p className="text-xs text-gray-500">
            문제당 {REWARD_PER_QUIZ}원 · 오늘 {completed}/{DAILY_QUIZ_LIMIT}개 완료
          </p>
        </div>
        {remaining > 0 ? (
          <span className="shrink-0 text-xs font-bold text-white bg-accent px-3 py-1.5 rounded-full animate-badge-pulse">
            {remaining}개 남음
          </span>
        ) : (
          <span className="shrink-0 text-xs font-bold text-brand-dark bg-brand-light px-3 py-1.5 rounded-full">
            완료 ✓
          </span>
        )}
      </Link>
    </section>
  );
}
