"use client";

import { useState } from "react";
import Link from "next/link";
import { dailyQuizzes, REWARD_PER_QUIZ, DAILY_QUIZ_LIMIT } from "@/lib/quiz-data";
import { usePoints } from "@/lib/points-context";

export default function QuizPage() {
  const { balance, todayAnsweredIds, isAnsweredToday, answerQuiz } = usePoints();
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [toast, setToast] = useState(false);

  const completedCount = todayAnsweredIds.length;
  const remaining = Math.max(0, DAILY_QUIZ_LIMIT - completedCount);

  const current = dailyQuizzes.find((q) => q.id === openId) ?? null;

  const openQuiz = (id: string) => {
    setOpenId(id);
    setSelected(null);
    setFeedback(null);
  };

  const submit = () => {
    if (!current || selected === null) return;
    const correct = selected === current.answerIndex;
    setFeedback(correct ? "correct" : "wrong");
    if (correct && !isAnsweredToday(current.id)) {
      answerQuiz(current.id, REWARD_PER_QUIZ, `퀴즈 정답 - ${current.question.slice(0, 12)}...`);
      setToast(true);
      setTimeout(() => setToast(false), 1800);
    }
  };

  return (
    <div className="px-4 py-6 relative">
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg animate-pop-in whitespace-nowrap">
          🎉 +{REWARD_PER_QUIZ}원 적립되었어요!
        </div>
      )}

      {/* header card */}
      <div className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white p-5 mb-6 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-xl animate-blob" />
        <p className="text-sm font-medium opacity-90 mb-1">오늘의 퀴즈</p>
        <h1 className="text-xl font-extrabold mb-3">쉬운 퀴즈 풀고 적립금 받기 🎁</h1>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold">{completedCount}</span>
            <span className="text-sm opacity-90">/ {DAILY_QUIZ_LIMIT} 완료</span>
          </div>
          <div className="text-right">
            <p className="text-[11px] opacity-80">보유 적립금</p>
            <p className="font-bold">{balance.toLocaleString()}원</p>
          </div>
        </div>
        <div className="w-full h-2 bg-white/25 rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / DAILY_QUIZ_LIMIT) * 100}%` }}
          />
        </div>
        {remaining === 0 && (
          <p className="text-xs mt-2 bg-white/15 rounded-full px-3 py-1 inline-block">
            오늘 퀴즈를 모두 완료했어요! 내일 자정에 초기화됩니다 ✨
          </p>
        )}
      </div>

      {/* quiz list */}
      <div className="space-y-3">
        {dailyQuizzes.map((q, i) => {
          const done = isAnsweredToday(q.id);
          return (
            <button
              key={q.id}
              onClick={() => !done && openQuiz(q.id)}
              disabled={done}
              className={`w-full text-left rounded-xl border p-4 flex items-center gap-3 transition card-tap ${
                done
                  ? "bg-brand-light/50 border-brand-light text-gray-400"
                  : "bg-white border-gray-100 hover:border-brand/40 hover:shadow-md"
              }`}
            >
              <span
                className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                  done ? "bg-brand text-white" : "bg-brand-light text-brand-dark"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${done ? "line-through" : "text-gray-800"}`}>
                  {q.question}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {done ? "오늘 완료" : `정답 시 +${REWARD_PER_QUIZ}원 적립`}
                </p>
              </div>
              {!done && <span className="text-brand-dark text-sm font-semibold shrink-0">풀기 &gt;</span>}
            </button>
          );
        })}
      </div>

      <Link
        href="/mypage"
        className="block text-center mt-6 text-sm text-brand-dark font-semibold"
      >
        적립금 내역 보러가기 →
      </Link>

      {/* quiz modal */}
      {current && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpenId(null)}
          />
          <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl p-5 pb-8 animate-pop-in">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <p className="text-xs text-brand-dark font-semibold mb-1">오늘의 퀴즈</p>
            <h2 className="text-lg font-bold text-gray-900 mb-4">{current.question}</h2>

            <div className="space-y-2 mb-4">
              {current.choices.map((choice, idx) => {
                const isSelected = selected === idx;
                const isCorrectChoice = feedback && idx === current.answerIndex;
                const isWrongSelected = feedback === "wrong" && isSelected;
                return (
                  <button
                    key={idx}
                    disabled={!!feedback}
                    onClick={() => setSelected(idx)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition ${
                      isCorrectChoice
                        ? "border-brand bg-brand-light text-brand-dark"
                        : isWrongSelected
                        ? "border-red-300 bg-red-50 text-red-500"
                        : isSelected
                        ? "border-brand text-brand-dark bg-brand-light/50"
                        : "border-gray-200 text-gray-700"
                    }`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {feedback && (
              <div
                className={`text-sm rounded-xl p-3 mb-4 ${
                  feedback === "correct"
                    ? "bg-brand-light text-brand-dark"
                    : "bg-red-50 text-red-500"
                }`}
              >
                {feedback === "correct" ? `🎉 정답이에요! +${REWARD_PER_QUIZ}원 적립` : "😅 아쉬워요, 정답은 다시 확인해보세요."}
                <p className="text-gray-500 mt-1">{current.explanation}</p>
              </div>
            )}

            {!feedback ? (
              <button
                onClick={submit}
                disabled={selected === null}
                className="w-full bg-gradient-to-r from-brand to-brand-dark text-white font-semibold py-3 rounded-full disabled:opacity-40 active:scale-[0.97] transition"
              >
                정답 제출
              </button>
            ) : (
              <button
                onClick={() => setOpenId(null)}
                className="w-full bg-gray-900 text-white font-semibold py-3 rounded-full active:scale-[0.97] transition"
              >
                닫기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
