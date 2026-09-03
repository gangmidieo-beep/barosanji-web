"use client";
import { useState } from "react";

export default function SettlementActions({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const act = async (status: "paid" | "rejected") => {
    const msg = status === "paid" ? "실제 이체를 완료하셨나요? '지급완료'로 표시합니다." : "이 정산 신청을 반려할까요?";
    if (!confirm(msg)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settlements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      const data = await res.json();
      if (data.success) location.reload(); else alert(data.errorMessage ?? "오류");
    } catch { alert("네트워크 오류"); } finally { setBusy(false); }
  };
  return (
    <div className="flex gap-1.5">
      <button onClick={() => act("paid")} disabled={busy} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-brand text-white disabled:opacity-60">지급완료</button>
      <button onClick={() => act("rejected")} disabled={busy} className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500">반려</button>
    </div>
  );
}
