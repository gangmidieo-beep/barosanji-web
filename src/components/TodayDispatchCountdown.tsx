"use client";

import { useEffect, useState } from "react";

/** 다음 "오전 8시"까지 남은 시간을 계산 — 이미 8시가 지났으면 내일 8시 기준 */
function getRemaining() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(8, 0, 0, 0);
  if (now.getTime() >= target.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  const diff = Math.max(0, target.getTime() - now.getTime());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { h, m, s };
}

export default function TodayDispatchCountdown() {
  const [time, setTime] = useState<{ h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    setTime(getRemaining());
    const id = setInterval(() => setTime(getRemaining()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="text-[11px] text-brand-dark font-semibold mt-1 flex items-center gap-1">
      🚚 오늘출발
      <span className="text-gray-400 font-normal tabular-nums">
        {pad(time.h)}:{pad(time.m)}:{pad(time.s)} 마감
      </span>
    </span>
  );
}
