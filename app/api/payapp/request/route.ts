import { NextRequest, NextResponse } from "next/server";
import { isPayAppConfigured, requestPayApp } from "@/lib/payapp";
import { createPendingOrder, type NewOrderItem } from "@/lib/db-orders";

export async function POST(req: NextRequest) {
  if (!isPayAppConfigured()) {
    return NextResponse.json(
      {
        success: false,
        errorMessage:
          "페이앱 연동 정보(PAYAPP_USERID / PAYAPP_LINKKEY / PAYAPP_LINKVAL)가 설정되어 있지 않습니다. .env.local을 확인해주세요.",
      },
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

  // 결제완료 웹훅(feedback)에서 어드민플러스로 발주를 올릴 때 필요하므로
  // 배송지/상품 목록을 주문 DB에 "결제대기" 상태로 미리 저장해둔다.
  if (body.receiverName && body.receiverAddress && Array.isArray(body.items)) {
    const items: NewOrderItem[] = body.items
      .filter((it: unknown) => it && typeof it === "object")
      .map((it: { name?: unknown; unit?: unknown; quantity?: unknown; price?: unknown; supplierId?: unknown }) => ({
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
