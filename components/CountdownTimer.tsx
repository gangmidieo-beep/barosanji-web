"use client";

import { useEffect, useState } from "react";

function getRemaining() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0); // midnight
  const diff = Math.max(0, end.getTime() - now.getTime());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { h, m, s };
}

export default function CountdownTimer() {
  const [time, setTime] = useState<{ h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    setTime(getRemaining());
    const id = setInterval(() => setTime(getRemaining()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-gradient-to-r from-accent to-orange-500 px-2 py-1 rounded-full tabular-nums">
      ⏱ {pad(time.h)}:{pad(time.m)}:{pad(time.s)} 남음
    </span>
  );
}
