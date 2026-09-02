"use client";

import { useState } from "react";
import Link from "next/link";

export default function PartnerAuthPage() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const url = tab === "login" ? "/api/partner/login" : "/api/partner/signup";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "/partner";
      } else {
        setMsg(data.errorMessage ?? "오류가 발생했어요.");
      }
    } catch {
      setMsg("네트워크 오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff8f1" }} className="flex flex-col">
      <div className="max-w-[420px] w-full mx-auto px-5 pt-10 pb-16">
        <div className="text-center mb-6">
          <div className="text-3xl">🥕</div>
          <h1 className="text-2xl font-black text-[#ff7a1a] mt-1">바로산지 파트너</h1>
          <p className="text-sm text-gray-500 mt-1">링크 공유하고 <b className="text-[#2f9e44]">수수료 15%</b> 받으세요</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-2 flex mb-4">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 py-2.5 rounded-2xl text-sm font-bold ${tab === "login" ? "bg-[#ff7a1a] text-white" : "text-gray-400"}`}
          >로그인</button>
          <button
            onClick={() => setTab("signup")}
            className={`flex-1 py-2.5 rounded-2xl text-sm font-bold ${tab === "signup" ? "bg-[#ff7a1a] text-white" : "text-gray-400"}`}
          >가입하기</button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3">
          {tab === "signup" && (
            <div>
              <label className="text-xs font-bold text-gray-500">이름 (선택)</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동"
                className="w-full mt-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm" />
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-gray-500">이메일</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="partner@example.com"
              className="w-full mt-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">비밀번호</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="6자 이상"
              className="w-full mt-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm" />
          </div>

          {msg && <p className="text-sm text-red-500 font-medium">{msg}</p>}

          <button onClick={submit} disabled={busy}
            className="w-full bg-[#ff7a1a] text-white font-black py-3.5 rounded-2xl shadow-md shadow-[#ff7a1a33] active:scale-[0.98] transition disabled:opacity-60">
            {busy ? "처리 중..." : tab === "login" ? "로그인" : "가입하고 시작하기 🚀"}
          </button>

          {tab === "signup" && (
            <p className="text-[11px] text-gray-400 text-center leading-relaxed">
              가입 시 <Link href="/partner/terms" className="underline">파트너 약관</Link>에 동의하는 것으로 간주됩니다.
            </p>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-gray-400 underline">← 바로산지 쇼핑몰로</Link>
        </div>
      </div>
    </div>
  );
}
