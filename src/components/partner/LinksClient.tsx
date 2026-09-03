"use client";
import { useState } from "react";

type P = {
  id: string; rank: number; name: string; price: number; reward: number;
  image: string; soldOut: boolean; code: string | null;
};

export default function LinksClient({ products, siteUrl }: { products: P[]; siteUrl: string }) {
  const [codes, setCodes] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const p of products) if (p.code) m[p.id] = p.code;
    return m;
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const make = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch("/api/partner/links", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id }),
      });
      const data = await res.json();
      if (data.success) setCodes((c) => ({ ...c, [id]: data.code }));
      else alert(data.errorMessage ?? "오류가 발생했어요.");
    } catch { alert("네트워크 오류가 발생했어요."); }
    finally { setBusy(null); }
  };

  const copy = async (id: string, code: string) => {
    const url = `${siteUrl}/r?ref=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id); setTimeout(() => setCopied(null), 1500);
    } catch { window.prompt("이 링크를 복사하세요", url); }
  };

  return (
    <div className="space-y-2.5">
      {products.map((p) => {
        const code = codes[p.id];
        return (
          <div key={p.id} className={`bg-white rounded-2xl p-3 shadow-sm flex gap-3 items-center ${p.soldOut ? "opacity-60" : ""}`}>
            {/* 이미지+상품명 클릭 → 상세페이지(새 탭). 손님이 보는 화면 그대로 확인 */}
            <a href={`/product/${p.id}`} target="_blank" rel="noopener noreferrer"
              className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-[#fff5ec] flex items-center justify-center">
              <span className="absolute inset-0 flex items-center justify-center text-2xl">🥬</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.name} loading="lazy"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
                className="absolute inset-0 w-full h-full object-cover" />
              <span className="absolute top-0 left-0 bg-[#ff7a1a] text-white text-[10px] font-black px-1.5 py-0.5 rounded-br-lg">{p.rank}</span>
            </a>

            <div className="min-w-0 flex-1">
              <a href={`/product/${p.id}`} target="_blank" rel="noopener noreferrer" className="block">
                <div className="font-bold text-sm text-gray-800 truncate">{p.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">판매가 {p.price.toLocaleString()}원 <span className="text-[#ff7a1a] font-bold">상세보기›</span></div>
              </a>
              <div className="text-xs mt-0.5">내 수익 <b className="text-[#2f9e44]">{p.reward.toLocaleString()}원</b></div>
              {code && (
                <div className="text-[10px] text-gray-500 bg-[#fff5ec] rounded-md px-2 py-1 mt-1 break-all font-mono">
                  {siteUrl}/r?ref={code}
                </div>
              )}
            </div>

            <div className="shrink-0">
              {p.soldOut ? (
                <span className="text-xs font-bold text-gray-400">품절</span>
              ) : !code ? (
                <button onClick={() => make(p.id)} disabled={busy === p.id}
                  className="bg-[#ff7a1a] text-white text-xs font-black px-3 py-2.5 rounded-full disabled:opacity-60 whitespace-nowrap">
                  {busy === p.id ? "생성중" : "링크 만들기"}
                </button>
              ) : (
                <button onClick={() => copy(p.id, code)}
                  className="bg-[#2f9e44] text-white text-xs font-black px-3 py-2.5 rounded-full whitespace-nowrap">
                  {copied === p.id ? "✅복사!" : "📋 복사"}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {products.length === 0 && <p className="text-center text-gray-400 py-10">판매 중인 상품이 없어요.</p>}
    </div>
  );
}
