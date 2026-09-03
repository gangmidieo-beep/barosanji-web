"use client";
import { useState } from "react";

type P = { id: string; name: string; price: number; reward: number; code: string | null };

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id }),
      });
      const data = await res.json();
      if (data.success) setCodes((c) => ({ ...c, [id]: data.code }));
      else alert(data.errorMessage ?? "오류가 발생했어요.");
    } catch {
      alert("네트워크 오류가 발생했어요.");
    } finally {
      setBusy(null);
    }
  };

  const copy = async (id: string, code: string) => {
    const url = `${siteUrl}/r?ref=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt("이 링크를 복사하세요", url);
    }
  };

  return (
    <div className="space-y-2.5">
      {products.map((p) => {
        const code = codes[p.id];
        return (
          <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-sm text-gray-800 truncate">{p.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  판매가 {p.price.toLocaleString()}원 · 내 수익 <b className="text-[#2f9e44]">{p.reward.toLocaleString()}원</b>
                </div>
              </div>
              {!code ? (
                <button onClick={() => make(p.id)} disabled={busy === p.id}
                  className="shrink-0 bg-[#ff7a1a] text-white text-xs font-black px-3.5 py-2.5 rounded-full disabled:opacity-60">
                  {busy === p.id ? "생성 중" : "링크 만들기"}
                </button>
              ) : (
                <button onClick={() => copy(p.id, code)}
                  className="shrink-0 bg-[#2f9e44] text-white text-xs font-black px-3.5 py-2.5 rounded-full">
                  {copied === p.id ? "✅ 복사!" : "📋 복사"}
                </button>
              )}
            </div>
            {code && (
              <div className="text-[11px] text-gray-500 bg-[#fff5ec] rounded-lg p-2 mt-2 break-all font-mono">
                {siteUrl}/r?ref={code}
              </div>
            )}
          </div>
        );
      })}
      {products.length === 0 && <p className="text-center text-gray-400 py-10">판매 중인 상품이 없어요.</p>}
    </div>
  );
}
