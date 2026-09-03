"use client";
import { useMemo, useState } from "react";

type Item = {
  createdAt: string; productId: string | null; name: string;
  qty: number; amount: number; commission: number; refunded: boolean; paid: boolean;
};
type Range = "today" | "week" | "month" | "all";
const won = (n: number) => n.toLocaleString() + "원";
const KST = 9 * 60 * 60 * 1000;

function startOf(range: Range): number {
  if (range === "all") return 0;
  const nowKst = new Date(Date.now() + KST);
  if (range === "today") return Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth(), nowKst.getUTCDate()) - KST;
  if (range === "month") return Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth(), 1) - KST;
  // week: 최근 7일(오늘 포함)
  const todayStart = Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth(), nowKst.getUTCDate()) - KST;
  return todayStart - 6 * 24 * 60 * 60 * 1000;
}

export default function ReportClient({ items, totalClicks }: { items: Item[]; totalClicks: number }) {
  const [range, setRange] = useState<Range>("today");

  const view = useMemo(() => {
    const from = startOf(range);
    const filtered = items.filter((it) => new Date(it.createdAt).getTime() >= from);

    let salesQty = 0, refundQty = 0, paidAmount = 0, commission = 0;
    const byProduct = new Map<string, { name: string; qty: number; amount: number; commission: number }>();
    for (const it of filtered) {
      if (it.refunded) { refundQty += it.qty; continue; }
      if (!it.paid) continue;
      salesQty += it.qty;
      paidAmount += it.amount;
      commission += it.commission;
      const key = it.productId ?? it.name;
      const cur = byProduct.get(key) ?? { name: it.name, qty: 0, amount: 0, commission: 0 };
      cur.qty += it.qty; cur.amount += it.amount; cur.commission += it.commission;
      byProduct.set(key, cur);
    }
    const products = Array.from(byProduct.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.commission - a.commission);
    return { salesQty, refundQty, paidAmount, commission, products };
  }, [items, range]);

  const tabs: { k: Range; label: string }[] = [
    { k: "today", label: "오늘" }, { k: "week", label: "이번주" },
    { k: "month", label: "이번달" }, { k: "all", label: "전체" },
  ];

  return (
    <div>
      {/* 기간 탭 */}
      <div className="flex gap-1.5 mb-3">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setRange(t.k)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${range === t.k ? "bg-[#ff7a1a] text-white" : "bg-white text-gray-400"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white rounded-2xl p-3.5 shadow-sm"><div className="text-xs text-gray-400">클릭(전체)</div><div className="text-lg font-black mt-0.5">{totalClicks}</div></div>
        <div className="bg-white rounded-2xl p-3.5 shadow-sm"><div className="text-xs text-gray-400">판매 수량</div><div className="text-lg font-black mt-0.5">{view.salesQty}건</div></div>
        <div className="bg-white rounded-2xl p-3.5 shadow-sm"><div className="text-xs text-gray-400">실 결제금액</div><div className="text-lg font-black mt-0.5">{won(view.paidAmount)}</div></div>
        <div className="bg-white rounded-2xl p-3.5 shadow-sm"><div className="text-xs text-gray-400">예상 수익금</div><div className="text-lg font-black mt-0.5 text-[#2f9e44]">{won(view.commission)}</div></div>
      </div>
      {view.refundQty > 0 && <p className="text-[11px] text-gray-400 mt-2">환불 {view.refundQty}건은 수익에서 제외됐어요.</p>}

      {/* 상품별 상세 */}
      <div className="text-[15px] font-black text-[#ff7a1a] mt-5 mb-2">상품별 실적</div>
      <div className="space-y-2">
        {view.products.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm bg-white rounded-2xl">이 기간엔 판매 실적이 없어요.</p>
        ) : (
          view.products.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl p-3 shadow-sm flex gap-3 items-center">
              <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden bg-[#fff5ec] flex items-center justify-center">
                <span className="absolute inset-0 flex items-center justify-center text-lg">🥬</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/product-image/${p.id}?field=images&index=0`} alt={p.name} loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                  className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-gray-800 truncate">{p.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{p.qty}건 · 결제 {won(p.amount)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] text-gray-400">수익</div>
                <div className="text-sm font-black text-[#2f9e44]">{won(p.commission)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
