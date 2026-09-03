import Link from "next/link";
import { requirePartner } from "@/lib/partner-session";
import { getPartnerStats, ensureGeneralLink } from "@/lib/db-partner";
import CopyLinkButton from "@/components/partner/CopyLinkButton";

export const dynamic = "force-dynamic";

const won = (n: number) => n.toLocaleString() + "원";

export default async function PartnerHome() {
  const partner = await requirePartner();
  await ensureGeneralLink(partner.id, partner.refCode);
  const stats = await getPartnerStats(partner.id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const myLink = `${siteUrl}/r?ref=${partner.refCode}`;

  return (
    <div className="px-4">
      <div className="rounded-3xl p-5 text-white" style={{ background: "linear-gradient(135deg,#ff9a3d,#ff7a1a)", boxShadow: "0 8px 20px #ff7a1a33" }}>
        <div className="text-sm opacity-95">이번 달 내 수익 💰</div>
        <div className="text-4xl font-black mt-1">{won(stats.monthEarnings)}</div>
        <div className="text-sm opacity-95 mt-1">이번 달 주문 {stats.monthOrders}건</div>
      </div>

      <div className="mt-3.5 rounded-2xl p-4 flex items-center gap-3" style={{ background: "#eaf7ee", border: "2px dashed #7bd39a" }}>
        <div className="text-3xl font-black text-[#2f9e44]">15%</div>
        <div className="text-sm font-extrabold text-[#1f7a34] leading-tight">수수료 업계 최고!<br />+ 정산도 빨라요 ⚡</div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3.5">
        <div className="bg-white rounded-2xl p-4 shadow-sm"><div className="text-xl">👆</div><div className="text-xs text-gray-400 mt-0.5">클릭</div><div className="text-2xl font-black mt-0.5">{stats.clicks}</div></div>
        <div className="bg-white rounded-2xl p-4 shadow-sm"><div className="text-xl">🎯</div><div className="text-xs text-gray-400 mt-0.5">전환율</div><div className="text-2xl font-black mt-0.5">{stats.conversion}%</div></div>
        <div className="bg-white rounded-2xl p-4 shadow-sm"><div className="text-xl">📦</div><div className="text-xs text-gray-400 mt-0.5">누적 수익</div><div className="text-2xl font-black mt-0.5">{won(stats.totalEarnings)}</div></div>
        <div className="bg-white rounded-2xl p-4 shadow-sm"><div className="text-xl">💸</div><div className="text-xs text-gray-400 mt-0.5">정산 대기</div><div className="text-2xl font-black mt-0.5 text-[#2f9e44]">{won(stats.pendingEarnings)}</div></div>
      </div>

      <div className="mt-5 text-[15px] font-black text-[#ff7a1a]">🔗 내 추천 링크</div>
      <div className="bg-white rounded-2xl p-4 mt-2 shadow-sm">
        <div className="text-[13px] text-gray-600 bg-[#fff5ec] rounded-xl p-3 break-all text-center font-mono">{myLink}</div>
        <CopyLinkButton text={myLink} label="📋 링크 복사!" />
        <Link href="/partner/links" className="block w-full mt-2.5 text-center bg-[#2f9e44] text-white font-black py-3.5 rounded-2xl">🛍 상품별 링크 만들기</Link>
      </div>
      <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
        내 링크로 들어온 손님이 구매하면 상품별 수수료(기본 15%)가 자동으로 쌓여요. 마지막에 클릭된 링크 1개에만 지급돼요.
      </p>
    </div>
  );
}
