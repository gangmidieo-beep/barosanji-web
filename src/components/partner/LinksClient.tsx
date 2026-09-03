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

  // 공정위 표시광고 기준: 수수료 받는 홍보임을 밝히는 문구를 링크와 함께 복사한다.
  const DISCLOSURE = "이 포스팅은 바로산지파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다";

  const copy = async (id: string, code: string) => {
    const url = `${siteUrl}/r?ref=${code}`;
    const text = `${url}\n\n${DISCLOSURE}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id); setTimeout(() => setCopied(null), 1500);
    } catch { window.prompt("이 링크를 복사하세요", text); }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
      {products.map((p) => {
        const code = codes[p.id];
        return (
          <div key={p.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col ${p.soldOut ? "opacity-60" : ""}`}>
            {/* 이미지 (누르면 상세페이지) */}
            <a href={`/product/${p.id}`} target="_blank" rel="noopener noreferrer"
              className="relative block aspect-square bg-[#fff5ec]">
              <span className="absolute inset-0 flex items-center justify-center text-3xl">🥬</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.name} loading="lazy"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
                className="absolute inset-0 w-full h-full object-cover" />
              <span className="absolute top-0 left-0 bg-[#ff7a1a] text-white text-[10px] font-black px-1.5 py-0.5 rounded-br-lg">{p.rank}</span>
              {p.soldOut && <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-sm font-black">품절</span>}
            </a>

            {/* 정보 */}
            <div className="p-2.5 flex flex-col flex-1">
              <a href={`/product/${p.id}`} target="_blank" rel="noopener noreferrer" className="block">
                <div className="font-bold text-[13px] text-gray-800 leading-tight line-clamp-2 min-h-[34px]">{p.name}</div>
              </a>
              <div className="text-[11px] text-gray-400 mt-1">{p.price.toLocaleString()}원</div>
              <div className="text-[12px] mt-0.5">내 수익 <b className="text-[#2f9e44]">{p.reward.toLocaleString()}원</b></div>

              {code && (
                <div className="text-[9px] text-gray-500 bg-[#fff5ec] rounded-md px-1.5 py-1 mt-1.5 break-all font-mono leading-tight">
                  /r?ref={code}
                </div>
              )}

              <div className="mt-auto pt-2">
                {p.soldOut ? (
                  <div className="text-center text-xs font-bold text-gray-400 py-2">품절</div>
                ) : !code ? (
                  <button onClick={() => make(p.id)} disabled={busy === p.id}
                    className="w-full bg-[#ff7a1a] text-white text-xs font-black py-2.5 rounded-xl disabled:opacity-60">
                    {busy === p.id ? "생성중" : "링크 만들기"}
                  </button>
                ) : (
                  <button onClick={() => copy(p.id, code)}
                    className="w-full bg-[#2f9e44] text-white text-xs font-black py-2.5 rounded-xl">
                    {copied === p.id ? "✅ 링크+문구 복사됨" : "📋 링크 복사"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {products.length === 0 && <p className="col-span-full text-center text-gray-400 py-10">판매 중인 상품이 없어요.</p>}
    </div>
  );
}
