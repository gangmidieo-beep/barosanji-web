"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePoints } from "@/lib/points-context";
import { DAILY_QUIZ_LIMIT, REWARD_PER_QUIZ, QUIZ_SLOT_INTERVAL_MS, getQuizzesForDate } from "@/lib/quiz-data";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function QuizTeaser() {
  const { todayAnsweredIds, isAnsweredToday, quizDayStart } = usePoints();
  const completed = todayAnsweredIds.length;
  const remaining = Math.max(0, DAILY_QUIZ_LIMIT - completed);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const quizzes = getQuizzesForDate(todayKey()).slice(0, DAILY_QUIZ_LIMIT);
  const nextUnlockMs = (() => {
    for (let i = 0; i < quizzes.length; i++) {
      const unlockAt = quizDayStart + i * QUIZ_SLOT_INTERVAL_MS;
      if (!isAnsweredToday(quizzes[i].id) && now < unlockAt) return unlockAt - now;
    }
    return null;
  })();

  return (
    <section className="px-4 pt-5">
      <Link
        href="/quiz"
        className="card-tap flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-100 px-4 py-3.5"
      >
        <span className="text-3xl animate-float">🎯</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            오늘의 퀴즈 풀고 적립금 받기
            {nextUnlockMs !== null && (
              <span className="text-[10px] font-semibold text-gray-400">🕐 {formatCountdown(nextUnlockMs)}</span>
            )}
          </p>
          <p className="text-xs text-gray-500">
            문제당 {REWARD_PER_QUIZ}원 · 오늘 {completed}/{DAILY_QUIZ_LIMIT}개 완료 (하루 최대 {DAILY_QUIZ_LIMIT}개)
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
