import { NextRequest, NextResponse } from "next/server";
import { isPayAppConfigured, requestPayApp } from "@/lib/payapp";
import { createPendingOrder, type NewOrderItem } from "@/lib/db-orders";
import { parseRefCookie, REF_COOKIE } from "@/lib/affiliate";
import { getOrderingDisabledSupplierIds, listSuppliers } from "@/lib/db-suppliers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isPayAppConfigured()) {
    return NextResponse.json(
      { success: false, errorMessage: "페이앱 연동 정보가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.goodname || !body.price || !body.recvphone || !body.orderId) {
    return NextResponse.json(
      { success: false, errorMessage: "필수 값이 누락되었습니다 (goodname, price, recvphone, orderId)." },
      { status: 400 }
    );
  }

  const orderId = String(body.orderId);
  // 추천 링크 쿠키(있으면) → 마지막 클릭 파트너 1명 (last-click)
  const ref = parseRefCookie(req.cookies.get(REF_COOKIE)?.value);

  // 발주가 중지된 공급사의 상품은 결제를 막는다.
  // 결제를 받아놓고 공급사에 넘기지 못하면 환불·고객 응대가 훨씬 비싸다 — 여기서 먼저 끊는다.
  if (Array.isArray(body.items)) {
    const disabled = await getOrderingDisabledSupplierIds();
    const blocked = body.items.filter(
      (it: { supplierId?: unknown }) => it?.supplierId && disabled.has(String(it.supplierId))
    );
    if (blocked.length > 0) {
      const suppliers = await listSuppliers();
      const nameById = new Map(suppliers.map((s) => [s.id, s.name]));
      const names = Array.from(
        new Set(blocked.map((it: { supplierId?: unknown }) => nameById.get(String(it.supplierId)) ?? "해당 공급사"))
      );
      console.warn("[payapp request] 발주 중지 공급사 상품이 담겨 결제를 막음", {
        orderId,
        suppliers: names,
        items: blocked.map((it: { name?: unknown }) => String(it.name ?? "")),
      });
      return NextResponse.json(
        {
          success: false,
          errorMessage: `현재 주문할 수 없는 상품이 담겨 있습니다 (${names.join(", ")} 상품). 장바구니에서 빼고 다시 시도해주세요.`,
        },
        { status: 409 }
      );
    }
  }

  // 결제완료 웹훅에서 발주를 올릴 수 있도록 주문을 "결제대기"로 미리 저장
  if (body.receiverName && body.receiverAddress && Array.isArray(body.items)) {
    const items: NewOrderItem[] = body.items
      .filter((it: unknown) => it && typeof it === "object")
      .map((it: { productId?: unknown; name?: unknown; unit?: unknown; quantity?: unknown; price?: unknown; supplierId?: unknown }) => ({
        productId: it.productId ? String(it.productId) : undefined,
        name: String(it.name ?? ""),
        unit: it.unit ? String(it.unit) : "",
        quantity: Number(it.quantity ?? 1),
        price: Number(it.price ?? 0),
        supplierId: String(it.supplierId ?? ""),
      }));

    await createPendingOrder({
      id: orderId,
      receiverName: String(body.receiverName),
      receiverPhone: String(body.recvphone),
      receiverAddress: String(body.receiverAddress),
      receiverAddressDetail: body.receiverAddressDetail ? String(body.receiverAddressDetail) : undefined,
      deliveryMemo: body.deliveryMemo ? String(body.deliveryMemo) : undefined,
      items,
      amount: Number(body.price),
      referrerPartnerId: ref?.partnerId ?? null,
      referrerLinkId: ref?.linkId ?? null,
    });
  }

  const result = await requestPayApp({
    goodname: String(body.goodname),
    price: Number(body.price),
    recvphone: String(body.recvphone),
    orderId,
  });

  return NextResponse.json(result);
}
