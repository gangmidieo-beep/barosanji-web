import Link from "next/link";
import { requirePartner } from "@/lib/partner-session";

export const dynamic = "force-dynamic";

export default async function PartnerAppLayout({ children }: { children: React.ReactNode }) {
  const partner = await requirePartner();
  return (
    <div style={{ minHeight: "100vh", background: "#fff8f1" }}>
      <div className="max-w-[440px] mx-auto pb-24">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="text-lg font-black text-[#ff7a1a]">🥕 바로산지 파트너</div>
          <div className="text-xs text-gray-500">{partner.name || partner.email}</div>
        </div>
        {children}
      </div>
      <nav
        className="fixed bottom-0 left-0 right-0 max-w-[440px] mx-auto bg-white border-t border-[#ffe6d3] flex justify-around py-2.5"
        style={{ borderRadius: "22px 22px 0 0" }}
      >
        <Link href="/partner" className="text-[11px] font-bold text-[#ff7a1a] text-center">
          <span className="block text-xl">🏠</span>홈
        </Link>
        <Link href="/partner/links" className="text-[11px] font-bold text-[#c0a999] text-center">
          <span className="block text-xl">🔗</span>링크
        </Link>
        <Link href="/partner/report" className="text-[11px] font-bold text-[#c0a999] text-center">
          <span className="block text-xl">📊</span>통계
        </Link>
        <Link href="/partner/settlement" className="text-[11px] font-bold text-[#c0a999] text-center">
          <span className="block text-xl">💰</span>정산
        </Link>
        <Link href="/partner/profile" className="text-[11px] font-bold text-[#c0a999] text-center">
          <span className="block text-xl">👤</span>내정보
        </Link>
      </nav>
    </div>
  );
}
