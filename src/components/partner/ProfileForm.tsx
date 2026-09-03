"use client";
import { useState } from "react";

type Bank = { bankName: string; bankAccount: string; bankHolder: string };

export default function ProfileForm({ initial }: { initial: Bank }) {
  const [f, setF] = useState<Bank>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/partner/profile", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f),
      });
      const data = await res.json();
      setMsg(data.success ? "저장됐어요 ✅" : data.errorMessage ?? "오류");
    } catch { setMsg("네트워크 오류"); }
    finally { setBusy(false); }
  };

  const logout = async () => {
    await fetch("/api/partner/logout", { method: "POST" }).catch(() => {});
    location.href = "/partner/login";
  };

  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <div className="text-sm font-black text-gray-700">💳 정산받을 계좌</div>
        <div>
          <label className="text-xs text-gray-400">은행</label>
          <input value={f.bankName} onChange={(e) => setF({ ...f, bankName: e.target.value })} placeholder="예: 국민은행"
            className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-400">계좌번호</label>
          <input value={f.bankAccount} onChange={(e) => setF({ ...f, bankAccount: e.target.value })} placeholder="- 없이 숫자만"
            className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-400">예금주</label>
          <input value={f.bankHolder} onChange={(e) => setF({ ...f, bankHolder: e.target.value })} placeholder="홍길동"
            className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        </div>
        {msg && <p className="text-xs font-medium text-[#2f9e44]">{msg}</p>}
        <button onClick={save} disabled={busy}
          className="w-full bg-[#ff7a1a] text-white font-black py-3 rounded-2xl disabled:opacity-60">
          {busy ? "저장 중..." : "계좌 저장"}
        </button>
      </div>
      <button onClick={logout} className="w-full mt-4 text-sm text-gray-400 underline py-2">로그아웃</button>
    </>
  );
}
