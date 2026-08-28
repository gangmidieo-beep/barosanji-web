"use client";

import { useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { dailyQuizzes, REWARD_PER_QUIZ, DAILY_QUIZ_LIMIT, type QuizQuestion } from "@/lib/quiz-data";

export default function PointsAdminPage() {
  const [reward, setReward] = useState(REWARD_PER_QUIZ);
  const [dailyLimit, setDailyLimit] = useState(DAILY_QUIZ_LIMIT);
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>(dailyQuizzes);
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateQuiz = (id: string, patch: Partial<QuizQuestion>) => {
    setQuizzes((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  return (
    <div>
      <AdminPageHeader
        title="적립금 · 퀴즈 관리"
        description="퀴즈 보상 정책과 문제 내용을 관리합니다."
      />

      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-4 py-3 mb-5">
        ⚠️ 데모 화면입니다 — 여기서 바꾼 값은 이 브라우저 화면 미리보기에만 반영되고, 실제 코드
        (`src/lib/quiz-data.ts`)나 쇼핑몰 화면에는 자동으로 반영되지 않습니다. 실제로 값을 바꾸려면
        말씀해주시면 코드를 직접 수정해드릴게요.
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <label className="text-xs text-gray-500 block mb-2">문제당 적립금 (원)</label>
          <input
            type="number"
            value={reward}
            onChange={(e) => setReward(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-lg font-bold text-brand-dark"
          />
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <label className="text-xs text-gray-500 block mb-2">하루 최대 문제 수</label>
          <input
            type="number"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-lg font-bold text-brand-dark"
          />
        </div>
      </div>

      <div className="bg-brand-light/50 rounded-lg px-4 py-2.5 text-sm text-brand-dark font-medium mb-4">
        하루 최대 적립 가능 금액: {(reward * dailyLimit).toLocaleString()}원 (문제당 {reward.toLocaleString()}원 × {dailyLimit}문제)
      </div>

      <h2 className="font-bold mb-3">오늘의 퀴즈 문제 ({quizzes.length}개)</h2>
      <div className="space-y-3">
        {quizzes.map((q, i) => (
          <div key={q.id} className="bg-white border border-gray-100 rounded-xl p-4">
            {editingId === q.id ? (
              <div className="space-y-2">
                <textarea
                  value={q.question}
                  onChange={(e) => updateQuiz(q.id, { question: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
                {q.choices.map((c, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={q.answerIndex === ci}
                      onChange={() => updateQuiz(q.id, { answerIndex: ci })}
                    />
                    <input
                      value={c}
                      onChange={(e) => {
                        const choices = [...q.choices];
                        choices[ci] = e.target.value;
                        updateQuiz(q.id, { choices });
                      }}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                    />
                  </div>
                ))}
                <input
                  value={q.explanation}
                  onChange={(e) => updateQuiz(q.id, { explanation: e.target.value })}
                  placeholder="해설"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                />
                <button
                  onClick={() => setEditingId(null)}
                  className="bg-brand text-white text-xs font-semibold px-4 py-1.5 rounded-full"
                >
                  완료
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">문제 {i + 1}</p>
                  <p className="font-medium text-gray-800 mb-1.5">{q.question}</p>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {q.choices.map((c, ci) => (
                      <span
                        key={ci}
                        className={`px-2 py-1 rounded-full ${
                          ci === q.answerIndex
                            ? "bg-emerald-50 text-emerald-700 font-semibold"
                            : "bg-gray-50 text-gray-500"
                        }`}
                      >
                        {ci === q.answerIndex ? "✓ " : ""}
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setEditingId(q.id)}
                  className="text-xs text-brand-dark font-medium shrink-0"
                >
                  수정
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
