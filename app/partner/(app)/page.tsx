import Link from "next/link";
import { requirePartner } from "@/lib/partner-session";
import { getPartnerStats, ensureGeneralLink, getPartnerProducts, listPartnerLinks } from "@/lib/db-partner";
import { getSettlementSummary } from "@/lib/db-settlement";
import LinksClient from "@/components/partner/LinksClient";

export const dynamic = "force-dynamic";
const won = (n: number) => n.toLocaleString() + "원";

export default async function PartnerHome() {
  const partner = await requirePartner();
  await ensureGeneralLink(partner.id, partner.refCode);

  const [stats, sum, productsRaw, linksRaw] = await Promise.all([
    getPartnerStats(partner.id),
    getSettlementSummary(partner.id),
    getPartnerProducts(),
    listPartnerLinks(partner.id),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const existingByProduct: Record<string, string> = {};
  for (const l of linksRaw) if (l.productId) existingByProduct[l.productId] = l.code;
  const products = productsRaw.map((p, i) => ({
    id: p.id, rank: i + 1, name: p.name, price: p.price, reward: p.reward,
    image: p.image, soldOut: p.soldOut, code: existingByProduct[p.id] ?? null,
  }));

  return (
    <div className="px-4">
      {/* 이번 달 수익 */}
      <div className="rounded-3xl p-5 text-white" style={{ background: "linear-gradient(135deg,#ff9a3d,#ff7a1a)", boxShadow: "0 8px 20px #ff7a1a33" }}>
        <div className="text-sm opacity-95">이번 달 내 수익 💰</div>
        <div className="text-4xl font-black mt-1">{won(stats.monthEarnings)}</div>
        <div className="text-sm opacity-95 mt-1">이번 달 주문 {stats.monthOrders}건</div>
      </div>

      {/* 정산 요약 (전액지급 — 소득세 없음) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mt-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-black text-gray-700">💸 정산 요약</div>
          <Link href="/partner/settlement" className="text-xs text-[#ff7a1a] font-bold">더보기 ›</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-xs text-gray-400">확정 수익금</div><div className="text-lg font-black mt-0.5">{won(sum.earned)}</div></div>
          <div><div className="text-xs text-gray-400">지금 받을 수 있는 금액</div><div className="text-lg font-black mt-0.5 text-[#2f9e44]">{won(sum.available)}</div></div>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">수수료는 전액 지급돼요 (원천징수 없음). 세금 신고는 파트너님이 직접 하시면 돼요.</p>
        <Link href="/partner/profile" className="block text-center text-xs text-[#ff7a1a] font-bold mt-2 underline">정산받을 계좌 등록하기</Link>
      </div>

      {/* 15% 배너 */}
      <div className="mt-3.5 rounded-2xl p-4 flex items-center gap-3" style={{ background: "#eaf7ee", border: "2px dashed #7bd39a" }}>
        <div className="text-3xl font-black text-[#2f9e44]">15%</div>
        <div className="text-sm font-extrabold text-[#1f7a34] leading-tight">수수료 업계 최고!<br />+ 정산도 빨라요 ⚡</div>
      </div>

      {/* 이용 방법 3단계 */}
      <div className="mt-5 bg-white rounded-2xl p-4 shadow-sm">
        <div className="text-sm font-black text-gray-800 mb-2">🚀 이렇게 시작하세요</div>
        <div className="space-y-2">
          <div className="flex gap-2.5 items-start"><span className="shrink-0 w-6 h-6 rounded-full bg-[#ff7a1a] text-white text-xs font-black flex items-center justify-center">1</span><div className="text-[13px] text-gray-600 pt-0.5">아래 상품에서 <b>내 링크 발급</b></div></div>
          <div className="flex gap-2.5 items-start"><span className="shrink-0 w-6 h-6 rounded-full bg-[#ff7a1a] text-white text-xs font-black flex items-center justify-center">2</span><div className="text-[13px] text-gray-600 pt-0.5">인스타·블로그·SNS에 <b>공유</b></div></div>
          <div className="flex gap-2.5 items-start"><span className="shrink-0 w-6 h-6 rounded-full bg-[#ff7a1a] text-white text-xs font-black flex items-center justify-center">3</span><div className="text-[13px] text-gray-600 pt-0.5">누가 사면 <b className="text-[#2f9e44]">수수료 15% 적립</b> → 원할 때 정산!</div></div>
        </div>
        <Link href="/partner/terms" className="block text-center text-xs text-[#ff7a1a] font-bold mt-3 underline">이용안내 · 운영정책 자세히 보기</Link>
      </div>

      {/* 지금 많이 팔리는 BEST — 홈에서 바로 발급 */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-[16px] font-black text-[#ff7a1a]">🔥 지금 많이 팔리는 BEST</div>
        <Link href="/partner/links" className="text-xs text-gray-400 font-bold">전체 ›</Link>
      </div>
      <p className="text-xs text-gray-500 mb-3 mt-0.5">상품을 눌러 상세를 보고, 나만의 링크를 발급하세요!</p>
      <LinksClient products={products} siteUrl={siteUrl} />
    </div>
  );
}
