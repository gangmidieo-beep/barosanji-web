import { listSettlementsForAdmin } from "@/lib/db-admin-affiliate";
import SettlementActions from "@/components/admin/SettlementActions";

export const dynamic = "force-dynamic";
const won = (n: number) => n.toLocaleString() + "원";
const KST = 9 * 60 * 60 * 1000;
function d(dt: Date) { const k = new Date(dt.getTime() + KST); return `${k.getUTCFullYear()}.${k.getUTCMonth() + 1}.${k.getUTCDate()}`; }
const label: Record<string, string> = { requested: "신청 (검토중)", paid: "지급완료", rejected: "반려" };

export default async function AdminSettlements() {
  const rows = await listSettlementsForAdmin();
  const pending = rows.filter((r) => r.status === "requested");
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-1">정산 관리</h1>
      <p className="text-sm text-gray-500 mb-4">파트너 정산 신청을 확인하고, 실제 이체 후 "지급완료"를 눌러주세요. 대기 {pending.length}건</p>
      <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
              <th className="px-4 py-3 font-medium">파트너</th>
              <th className="px-4 py-3 font-medium">금액</th>
              <th className="px-4 py-3 font-medium">입금 계좌</th>
              <th className="px-4 py-3 font-medium">신청일</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">처리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-3"><div className="font-medium">{r.partnerName || r.partnerEmail}</div><div className="text-xs text-gray-400">{r.partnerEmail}</div></td>
                <td className="px-4 py-3 font-bold text-brand-dark">{won(r.amount)}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{r.bankName} {r.bankAccount}<br/>({r.bankHolder})</td>
                <td className="px-4 py-3 text-xs text-gray-400">{d(r.requestedAt)}</td>
                <td className="px-4 py-3"><span className={`text-xs font-bold ${r.status === "paid" ? "text-brand-dark" : r.status === "rejected" ? "text-red-400" : "text-amber-500"}`}>{label[r.status] ?? r.status}</span></td>
                <td className="px-4 py-3">{r.status === "requested" ? <SettlementActions id={r.id} /> : <span className="text-xs text-gray-300">-</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">정산 신청 내역이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
