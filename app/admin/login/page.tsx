"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.errorMessage ?? "로그인에 실패했습니다.");
        setSubmitting(false);
        return;
      }
      const next = searchParams.get("next") || "/admin";
      router.push(next);
      router.refresh();
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-8 w-full max-w-sm shadow-sm">
        <h1 className="text-lg font-bold text-gray-900 mb-1">바로산지 관리자</h1>
        <p className="text-sm text-gray-500 mb-6">관리자 비밀번호를 입력해주세요.</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-3"
        />
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand text-white font-semibold py-2.5 rounded-full hover:bg-brand-dark transition disabled:opacity-60"
        >
          {submitting ? "확인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
