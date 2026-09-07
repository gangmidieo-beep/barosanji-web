"use client";

import { useState } from "react";

export const won = (n: number) => `${Math.round(n).toLocaleString()}원`;
export const pct = (r: number) => `${(r * 100).toFixed(1)}%`;
export const todayStr = () => {
  const k = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, "0")}-${String(k.getUTCDate()).padStart(2, "0")}`;
};
export const fmtDate = (iso: string) => {
  const k = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return `${k.getUTCFullYear()}.${String(k.getUTCMonth() + 1).padStart(2, "0")}.${String(k.getUTCDate()).padStart(2, "0")} ${String(k.getUTCHours()).padStart(2, "0")}:${String(k.getUTCMinutes()).padStart(2, "0")}`;
};
export const fmtDay = (iso: string) => fmtDate(iso).slice(0, 10);

export function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-100 rounded-xl p-5 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>}
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-gray-500">
      <span className="block mb-1">{label}</span>
      {children}
    </label>
  );
}

export const inputBase = "border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/30";
export const inputCls = "w-full " + inputBase;
export const btnPrimary = "px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark disabled:opacity-50";
export const btnGhost = "px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 whitespace-nowrap";

export type PeriodKey = "today" | "week" | "month" | "last30" | "custom";

export function PeriodPicker({
  value,
  onChange,
}: {
  value: { period: PeriodKey; from: string; to: string };
  onChange: (v: { period: PeriodKey; from: string; to: string }) => void;
}) {
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);
  const presets: { k: PeriodKey; label: string }[] = [
    { k: "today", label: "오늘" },
    { k: "week", label: "이번 주" },
    { k: "month", label: "이번 달" },
    { k: "last30", label: "최근 30일" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <button
          key={p.k}
          onClick={() => onChange({ period: p.k, from, to })}
          className={`px-3 py-1.5 rounded-full text-xs border ${
            value.period === p.k ? "bg-brand text-white border-brand" : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {p.label}
        </button>
      ))}
      <div className="flex items-center gap-1 text-xs">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1" />
        <span className="text-gray-400">~</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1" />
        <button onClick={() => from && to && onChange({ period: "custom", from, to })} className={btnGhost}>
          조회
        </button>
      </div>
    </div>
  );
}

export function periodQuery(v: { period: PeriodKey; from: string; to: string }) {
  return v.period === "custom" ? `period=custom&from=${v.from}&to=${v.to}` : `period=${v.period}`;
}

export function Empty({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm text-gray-400">{text}</div>;
}
