import { requirePartner } from "@/lib/partner-session";
import { getPartnerReportRaw } from "@/lib/db-partner-report";
import ReportClient from "@/components/partner/ReportClient";

export const dynamic = "force-dynamic";

export default async function PartnerReport() {
  const partner = await requirePartner();
  const data = await getPartnerReportRaw(partner.id);
  return (
    <div className="px-4">
      <div className="text-[16px] font-black text-[#ff7a1a] mb-3">📊 실적 대시보드</div>
      <ReportClient items={data.items} totalClicks={data.totalClicks} />
      <p className="text-[11px] text-gray-400 mt-4">결제 완료된 주문만 수익으로 잡혀요. 확정 수익금·정산은 정산 탭에서 확인하세요.</p>
    </div>
  );
}
