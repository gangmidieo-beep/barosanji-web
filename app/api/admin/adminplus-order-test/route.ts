import { NextRequest, NextResponse } from "next/server";
import { getOrderWithItems, type OrderWithItems } from "@/lib/db-orders";
import { getSupplierByIdFromDb } from "@/lib/db-suppliers";
import { getAdminProductById } from "@/lib/db-products";
import { createAdminPlusOrder, isAdminPlusConfigured } from "@/lib/adminplus";

/**
 * 관리자 전용 진단 — 기존 주문을 어드민플러스에 "다시 발주 시도"하고 raw 결과(에러 포함)를 보여준다.
 * 사용: /api/admin/adminplus-order-test?orderId=ORD-1788254121165
 * ⚠️ 성공하면 실제로 팡이유통에 발주가 등록되니, 한 번만 실행하세요. 실패면 아무것도 안 만들고 사유만 반환합니다.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId 쿼리 필요" }, { status: 400 });

  const order = await getOrderWithItems(orderId);
  if (!order) return NextResponse.json({ error: "주문 없음", orderId }, { status: 404 });

  const baseIds = Array.from(
    new Set(order.items.map((it) => it.productId?.split("::")[0]).filter((x): x is string => !!x))
  );
  const productById = new Map<string, Awaited<ReturnType<typeof getAdminProductById>>>();
  for (const b of baseIds) productById.set(b, await getAdminProductById(b));

  const resolveItem = (it: OrderWithItems["items"][number]) => {
    const baseId = it.productId?.split("::")[0];
    const product = baseId ? productById.get(baseId) : undefined;
    let code: string | undefined;
    if (product) {
      const opt = product.options?.find((o) => o.label === it.unit);
      code = (opt?.code || product.supplierProductCode) ?? undefined;
    }
    return code
      ? { product_code: code, quantity: it.quantity, _matched: "product_code" }
      : { product_string: it.name, quantity: it.quantity, _matched: "product_string(코드없음)" };
  };

  const bySupplier = new Map<string, OrderWithItems["items"]>();
  for (const item of order.items) {
    const key = item.supplierId || "unknown";
    if (!bySupplier.has(key)) bySupplier.set(key, []);
    bySupplier.get(key)!.push(item);
  }

  const results = [];
  for (const [supplierId, items] of bySupplier.entries()) {
    const supplier = await getSupplierByIdFromDb(supplierId);
    if (!supplier || !isAdminPlusConfigured(supplier.envKey)) {
      results.push({ supplierId, skipped: true, reason: "어드민플러스 미설정 업체(엑셀발주 등)" });
      continue;
    }
    const sent = items.map(resolveItem);
    const r = await createAdminPlusOrder(supplier.envKey, {
      customerOrderCode: `${order.id}-${supplierId}`,
      receiverName: order.receiverName,
      receiverPhone: order.receiverPhone,
      receiverAddress: order.receiverAddress,
      receiverAddressDetail: order.receiverAddressDetail ?? undefined,
      deliveryMemo: order.deliveryMemo ?? undefined,
      items: sent.map(({ _matched, ...rest }) => rest),
    });
    results.push({ supplier: supplier.name, envKey: supplier.envKey, sentItems: sent, result: r });
  }

  return NextResponse.json(
    {
      orderId,
      receiver: {
        name: order.receiverName,
        phone: order.receiverPhone,
        address: order.receiverAddress,
        addressDetail: order.receiverAddressDetail,
        zipcode: "(우리 주문엔 우편번호 미수집)",
      },
      results,
    },
    { status: 200 }
  );
}
