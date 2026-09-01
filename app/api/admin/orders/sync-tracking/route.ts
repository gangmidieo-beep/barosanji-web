import { NextResponse } from "next/server";
import { listSuppliers } from "@/lib/db-suppliers";
import { listOrdersForTrackingSync, updateOrderTracking } from "@/lib/db-orders";
import { fetchAdminPlusTracking, isAdminPlusConfigured } from "@/lib/adminplus";

/**
 * 송장 동기화 — 어드민플러스 주문조회로 발송된 주문의 송장번호/택배사를 가져와
 * 우리 주문(customer_order_code = `${orderId}-${supplierId}`)에 자동 기입한다.
 * 하루 1번 입금 후 눌러주면 충분하다.
 */
export const dynamic = "force-dynamic";

export async function POST() {
  const suppliers = await listSuppliers();

  // 1) 업체별로 송장 맵 수집
  const trackingByCode = new Map<string, { tracking: string; courier: string }>();
  const supplierResults: { name: string; ok: boolean; withTracking: number; error?: string }[] = [];

  for (const s of suppliers) {
    if (!isAdminPlusConfigured(s.envKey)) continue;
    const r = await fetchAdminPlusTracking(s.envKey);
    if (!r.success) {
      supplierResults.push({ name: s.name, ok: false, withTracking: 0, error: r.errorMessage });
      continue;
    }
    let withTracking = 0;
    for (const it of r.items) {
      if (it.trackingNumber) {
        trackingByCode.set(it.customerOrderCode, {
          tracking: it.trackingNumber,
          courier: it.shippingCompany ?? "",
        });
        withTracking++;
      }
    }
    supplierResults.push({ name: s.name, ok: true, withTracking });
  }

  // 2) 우리 주문과 매칭해서 송장 기입 (이미 송장 있으면 스킵)
  const orders = await listOrdersForTrackingSync();
  let updated = 0;
  for (const o of orders) {
    if (o.hasTracking) continue;
    for (const sid of o.supplierIds) {
      const t = trackingByCode.get(`${o.id}-${sid}`);
      if (t && t.tracking) {
        await updateOrderTracking(o.id, t.courier, t.tracking);
        updated++;
        break;
      }
    }
  }

  return NextResponse.json({
    success: true,
    updated,
    checked: orders.length,
    suppliers: supplierResults,
  });
}
