"use client";
import { useState } from "react";

export default function SettlementButton({ disabled }: { disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const req = async () => {
    if (!confirm("정산을 신청할까요? 신청 후 관리자 확인을 거쳐 지급돼요.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/partner/settlement", { method: "POST" });
      const data = await res.json();
      if (data.success) { alert("정산 신청 완료! 빠르게 처리해드릴게요 ⚡"); location.reload(); }
      else alert(data.errorMessage ?? "오류가 발생했어요.");
    } catch { alert("네트워크 오류가 발생했어요."); }
    finally { setBusy(false); }
  };
  return (
    <button onClick={req} disabled={disabled || busy}
      className="w-full mt-3 bg-[#2f9e44] text-white font-black py-3.5 rounded-2xl shadow-md active:scale-[0.98] transition disabled:opacity-40">
      {busy ? "신청 중..." : "정산 신청하기"}
    </button>
  );
}
