import { requirePartner } from "@/lib/partner-session";
import { getSettlementSummary, listSettlements } from "@/lib/db-settlement";
import SettlementButton from "@/components/partner/SettlementButton";

export const dynamic = "force-dynamic";
const won = (n: number) => n.toLocaleString() + "원";
const KST = 9 * 60 * 60 * 1000;
function d(dt: Date) { const k = new Date(dt.getTime() + KST); return `${k.getUTCFullYear()}.${k.getUTCMonth() + 1}.${k.getUTCDate()}`; }
const label: Record<string, string> = { requested: "신청 (검토중)", paid: "지급완료", rejected: "반려" };

export default async function PartnerSettlement() {
  const partner = await requirePartner();
  const [sum, history] = await Promise.all([getSettlementSummary(partner.id), listSettlements(partner.id)]);
  const hasBank = Boolean(partner.bankAccount && partner.bankHolder);

  return (
    <div className="px-4">
      <div className="text-[16px] font-black text-[#ff7a1a] mb-3">💰 정산</div>
      <div className="rounded-3xl p-5 text-white" style={{ background: "linear-gradient(135deg,#42c767,#2f9e44)" }}>
        <div className="text-sm opacity-95">지금 신청 가능한 금액</div>
        <div className="text-4xl font-black mt-1">{won(sum.available)}</div>
        <div className="text-xs opacity-90 mt-2">누적 수익 {won(sum.earned)} · 신청/지급됨 {won(sum.settledOrPending)}</div>
      </div>
      {!hasBank && (
        <div className="mt-3 bg-[#fff3cd] border border-[#ffe08a] rounded-2xl p-3 text-xs text-[#8a6d00]">
          ⚠️ 정산받을 계좌를 먼저 등록해야 신청할 수 있어요. <b>내정보</b> 탭에서 등록해주세요.
        </div>
      )}
      <SettlementButton disabled={sum.available <= 0 || !hasBank} />
      <div className="text-[15px] font-black text-[#ff7a1a] mt-6 mb-2">정산 내역</div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {history.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">정산 내역이 없어요.</p>
        ) : (
          history.map((h) => (
            <div key={h.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
              <div>
                <div className="text-sm font-bold">{won(h.amount)}</div>
                <div className="text-xs text-gray-400 mt-0.5">신청 {d(h.requestedAt)}{h.paidAt ? ` · 지급 ${d(h.paidAt)}` : ""}</div>
              </div>
              <span className={`text-xs font-bold ${h.status === "paid" ? "text-[#2f9e44]" : h.status === "rejected" ? "text-red-400" : "text-[#ff7a1a]"}`}>
                {label[h.status] ?? h.status}
              </span>
            </div>
          ))
        )}
      </div>
      <p className="text-[11px] text-gray-400 mt-3">신청하면 관리자 확인 후 등록하신 계좌로 지급돼요. 빠른 정산을 약속드려요 ⚡</p>
    </div>
  );
}
