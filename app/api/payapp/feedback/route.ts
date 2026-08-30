import { NextRequest } from "next/server";
import { verifyPayAppFeedback, isPaidState } from "@/lib/payapp";
import { getOrderWithItems, updateOrderPayResult, type OrderWithItems } from "@/lib/db-orders";
import { pushOrderToAdminPlus, isAdminPlusConfigured } from "@/lib/adminplus";
import { getSupplierByIdFromDb } from "@/lib/db-suppliers";

/**
 * 페이앱이 결제 상태가 바뀔 때마다 서버 대 서버로 호출하는 웹훅.
 * 반드시 응답 본문에 "SUCCESS" 텍스트를 200으로 반환해야 페이앱이 재시도하지 않는다.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const data: Record<string, string> = {};
  form.forEach((value, key) => {
    data[key] = String(value);
  });

  if (!verifyPayAppFeedback(data)) {
    // userid/linkkey/linkval이 일치하지 않으면 위조된 요청일 수 있으므로 무시
    return new Response("SUCCESS", { status: 200 });
  }

  const orderId = data.var1;
  const paid = isPaidState(data.pay_state);

  console.log("[payapp feedback]", { orderId, payState: data.pay_state, paid, mulNo: data.mul_no });

  // 주문 상태를 실제 DB에 반영 — 결제 완료면 "결제완료", 아니면 "결제취소"로 표시
  await updateOrderPayResult(orderId, paid ? "결제완료" : "결제취소", data.pay_state);

  // 결제가 실제로 완료된 건에 한해, 어드민플러스로 발주(산지/도매사 전달)를 올린다.
  // 한 주문에 여러 업체(supplierId)의 상품이 섞여 있을 수 있으므로, 업체별로 묶어서
  // 각자의 어드민플러스 계정으로 따로 발주를 올린다.
  if (paid) {
    const pending: OrderWithItems | undefined = await getOrderWithItems(orderId);
    if (pending) {
      const bySupplier = new Map<string, OrderWithItems["items"]>();
      for (const item of pending.items) {
        const key = item.supplierId || "unknown";
        if (!bySupplier.has(key)) bySupplier.set(key, []);
        bySupplier.get(key)!.push(item);
      }

      for (const [supplierId, items] of bySupplier.entries()) {
        const supplier = await getSupplierByIdFromDb(supplierId);
        if (!supplier) {
          console.error("[adminplus] 알 수 없는 supplierId — 발주 스킵", { orderId, supplierId });
          continue;
        }
        if (!isAdminPlusConfigured(supplier.envKey)) {
          console.log("[adminplus] 자격증명 미설정 — 발주 전송 스킵", {
            orderId,
            supplier: supplier.name,
          });
          continue;
        }

        const supplierAmount = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

        const result = await pushOrderToAdminPlus(
          supplier.envKey,
          {
            // 한 주문이 업체별로 나뉘므로, 어드민플러스 쪽 주문번호는 업체 ID를 붙여 구분
            customerOrderCode: `${pending.id}-${supplierId}`,
            receiverName: pending.receiverName,
            receiverPhone: pending.receiverPhone,
            receiverAddress: pending.receiverAddress,
            receiverAddressDetail: pending.receiverAddressDetail ?? undefined,
            deliveryMemo: pending.deliveryMemo ?? undefined,
            // 아직 어드민플러스에 상품코드를 매칭해두지 않았다면 상품명 문자열로 임시등록
            items: items.map((it) => ({
              product_string: it.name,
              quantity: it.quantity,
              price: it.price,
            })),
          },
          supplierAmount
        );

        if (!result.success) {
          // 발주 실패는 고객 결제 자체와는 무관하므로 웹훅 응답은 그대로 SUCCESS를 유지하되
          // 관리자가 확인할 수 있도록 로그를 남긴다. (실제 서비스에서는 알림/재시도 큐 권장)
          console.error("[adminplus push failed]", {
            orderId,
            supplier: supplier.name,
            error: result.errorMessage,
          });
        } else {
          console.log("[adminplus push ok]", {
            orderId,
            supplier: supplier.name,
            adminPlusOrderId: result.adminPlusOrderId,
          });
        }
      }
    }
  }

  return new Response("SUCCESS", { status: 200 });
}
