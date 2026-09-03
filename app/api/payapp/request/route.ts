import { NextRequest, NextResponse } from "next/server";
import { isPayAppConfigured, requestPayApp } from "@/lib/payapp";
import { createPendingOrder, type NewOrderItem } from "@/lib/db-orders";
import { parseRefCookie, REF_COOKIE } from "@/lib/affiliate";

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
