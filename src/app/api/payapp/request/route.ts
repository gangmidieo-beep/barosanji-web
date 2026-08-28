import { NextRequest, NextResponse } from "next/server";
import { isPayAppConfigured, requestPayApp } from "@/lib/payapp";
import { savePendingOrder, type PendingOrderItem } from "@/lib/pending-orders";

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
  // 배송지/상품 목록을 잠깐 저장해둔다. (실제 서비스 전환 시 DB 주문 테이블로 대체)
  if (body.receiverName && body.receiverAddress && Array.isArray(body.items)) {
    const items: PendingOrderItem[] = body.items
      .filter((it: unknown) => it && typeof it === "object")
      .map((it: { name?: unknown; quantity?: unknown; price?: unknown; supplierId?: unknown }) => ({
        name: String(it.name ?? ""),
        quantity: Number(it.quantity ?? 1),
        price: Number(it.price ?? 0),
        supplierId: String(it.supplierId ?? ""),
      }));

    savePendingOrder({
      orderId,
      receiverName: String(body.receiverName),
      receiverPhone: String(body.recvphone),
      receiverAddress: String(body.receiverAddress),
      receiverAddressDetail: body.receiverAddressDetail ? String(body.receiverAddressDetail) : undefined,
      deliveryMemo: body.deliveryMemo ? String(body.deliveryMemo) : undefined,
      items,
      amount: Number(body.price),
      createdAt: Date.now(),
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
