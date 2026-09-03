import { requirePartner } from "@/lib/partner-session";
import { getPartnerStats } from "@/lib/db-partner";
import { getPartnerRecentOrders } from "@/lib/db-settlement";

export const dynamic = "force-dynamic";
const won = (n: number) => n.toLocaleString() + "원";

export default async function PartnerReport() {
  const partner = await requirePartner();
  const [stats, orders] = await Promise.all([getPartnerStats(partner.id), getPartnerRecentOrders(partner.id)]);

  return (
    <div className="px-4">
      <div className="text-[16px] font-black text-[#ff7a1a] mb-3">📊 내 통계</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm"><div className="text-xs text-gray-400">이번 달 수익</div><div className="text-xl font-black mt-1">{won(stats.monthEarnings)}</div></div>
        <div className="bg-white rounded-2xl p-4 shadow-sm"><div className="text-xs text-gray-400">누적 수익</div><div className="text-xl font-black mt-1">{won(stats.totalEarnings)}</div></div>
        <div className="bg-white rounded-2xl p-4 shadow-sm"><div className="text-xs text-gray-400">클릭</div><div className="text-xl font-black mt-1">{stats.clicks}</div></div>
        <div className="bg-white rounded-2xl p-4 shadow-sm"><div className="text-xs text-gray-400">전환율</div><div className="text-xl font-black mt-1">{stats.conversion}%</div></div>
      </div>
      <div className="text-[15px] font-black text-[#ff7a1a] mt-5 mb-2">최근 소개 주문</div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">아직 소개한 주문이 없어요.<br />링크를 공유해보세요! 🔗</p>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
              <div>
                <div className="text-xs text-gray-500">{o.dateLabel} · {o.paid ? <span className="text-[#2f9e44] font-bold">{o.status}</span> : <span className="text-gray-400">{o.status}</span>}</div>
                <div className="text-sm font-medium text-gray-700 mt-0.5">주문금액 {o.amount.toLocaleString()}원</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">내 수익</div>
                <div className={`text-sm font-black ${o.paid ? "text-[#2f9e44]" : "text-gray-400"}`}>{won(o.commission)}</div>
              </div>
            </div>
          ))
        )}
      </div>
      <p className="text-[11px] text-gray-400 mt-3">결제 완료된 주문만 정산 대상이에요. 취소·미결제 건은 수익에 안 잡혀요.</p>
    </div>
  );
}
