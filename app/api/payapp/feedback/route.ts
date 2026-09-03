import { NextRequest } from "next/server";
import { verifyPayAppFeedback, isPaidState } from "@/lib/payapp";
import { getOrderWithItems, updateOrderPayResult, type OrderWithItems } from "@/lib/db-orders";
import { pushOrderToAdminPlus, isAdminPlusConfigured } from "@/lib/adminplus";
import { getSupplierByIdFromDb } from "@/lib/db-suppliers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 브라우저로 열었을 때(GET) 살아있는지 확인용 — 405 대신 안내 표시
export async function GET() {
  return new Response("payapp feedback endpoint OK (POST only)", { status: 200 });
}

export async function POST(req: NextRequest) {
  // 페이앱은 application/x-www-form-urlencoded 로 보냄. 혹시 몰라 방어적으로 파싱.
  const data: Record<string, string> = {};
  try {
    const form = await req.formData();
    form.forEach((value, key) => { data[key] = String(value); });
  } catch {
    try {
      const text = await req.text();
      new URLSearchParams(text).forEach((v, k) => { data[k] = v; });
    } catch { /* ignore */ }
  }

  // ▼▼ 디버그: 웹훅이 실제로 도착했는지, 어떤 값이 왔는지 전부 남긴다
  console.log("[payapp feedback] ← 웹훅 수신", {
    orderId: data.var1,
    pay_state: data.pay_state,
    mul_no: data.mul_no,
    goodname: data.goodname,
    price: data.price,
    keys: Object.keys(data),
  });

  const okVerify = verifyPayAppFeedback(data);
  if (!okVerify) {
    // 왜 실패했는지 (값 노출 없이) 어느 항목이 틀렸는지만 표시
    console.error("[payapp feedback] ✗ 검증 실패 — 무시함", {
      userid_match: data.userid === process.env.PAYAPP_USERID,
      linkkey_match: data.linkkey === process.env.PAYAPP_LINKKEY,
      linkval_match: data.linkval === process.env.PAYAPP_LINKVAL,
      got_userid: data.userid,
      has_linkkey: Boolean(data.linkkey),
      has_linkval: Boolean(data.linkval),
    });
    return new Response("SUCCESS", { status: 200 });
  }

  const orderId = data.var1;
  const paid = isPaidState(data.pay_state);
  console.log("[payapp feedback] ✓ 검증 통과", { orderId, paid, pay_state: data.pay_state });

  await updateOrderPayResult(orderId, paid ? "결제완료" : "결제취소", data.pay_state);
  console.log("[payapp feedback] 주문상태 갱신", { orderId, status: paid ? "결제완료" : "결제취소" });

  if (paid) {
    const pending: OrderWithItems | undefined = await getOrderWithItems(orderId);
    if (!pending) {
      console.error("[payapp feedback] 주문을 DB에서 못 찾음 — 발주 스킵", { orderId });
      return new Response("SUCCESS", { status: 200 });
    }
    const bySupplier = new Map<string, OrderWithItems["items"]>();
    for (const item of pending.items) {
      const key = item.supplierId || "unknown";
      if (!bySupplier.has(key)) bySupplier.set(key, []);
      bySupplier.get(key)!.push(item);
    }
    for (const [supplierId, items] of bySupplier.entries()) {
      const supplier = await getSupplierByIdFromDb(supplierId);
      if (!supplier) { console.error("[adminplus] 알 수 없는 supplierId — 발주 스킵", { orderId, supplierId }); continue; }
      if (!isAdminPlusConfigured(supplier.envKey)) { console.log("[adminplus] 자격증명 미설정 — 스킵", { orderId, supplier: supplier.name }); continue; }
      const supplierAmount = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
      const result = await pushOrderToAdminPlus(
        supplier.envKey,
        {
          customerOrderCode: `${pending.id}-${supplierId}`,
          receiverName: pending.receiverName,
          receiverPhone: pending.receiverPhone,
          receiverAddress: pending.receiverAddress,
          receiverAddressDetail: pending.receiverAddressDetail ?? undefined,
          deliveryMemo: pending.deliveryMemo ?? undefined,
          items: items.map((it) => ({
            product_string: it.name,
            quantity: it.quantity,
            price: it.price,
          })),
        },
        supplierAmount
      );
      if (!result.success) console.error("[adminplus push failed]", { orderId, supplier: supplier.name, error: result.errorMessage });
      else console.log("[adminplus push ok]", { orderId, supplier: supplier.name, adminPlusOrderId: result.adminPlusOrderId });
    }
  }

  return new Response("SUCCESS", { status: 200 });
}
