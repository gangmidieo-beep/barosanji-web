import { NextRequest, NextResponse } from "next/server";
import { createPendingOrder, updateOrderPayResult, type NewOrderItem } from "@/lib/db-orders";

/**
 * 적립금만으로 전액 결제되어 페이앱 결제창을 아예 띄우지 않는 주문을 기록한다.
 * (결제수단 자체가 없으니 결제완료 웹훅이 안 오므로, 여기서 바로 결제완료 처리)
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.orderId || !body.receiverName || !body.receiverAddress || !Array.isArray(body.items)) {
    return NextResponse.json({ success: false, errorMessage: "필수 값이 누락되었습니다." }, { status: 400 });
  }

  const items: NewOrderItem[] = body.items.map(
    (it: { name?: unknown; unit?: unknown; quantity?: unknown; price?: unknown; supplierId?: unknown }) => ({
      name: String(it.name ?? ""),
      unit: it.unit ? String(it.unit) : "",
      quantity: Number(it.quantity ?? 1),
      price: Number(it.price ?? 0),
      supplierId: String(it.supplierId ?? ""),
    })
  );

  await createPendingOrder({
    id: String(body.orderId),
    receiverName: String(body.receiverName),
    receiverPhone: String(body.recvphone ?? ""),
    receiverAddress: String(body.receiverAddress),
    receiverAddressDetail: body.receiverAddressDetail ? String(body.receiverAddressDetail) : undefined,
    deliveryMemo: body.deliveryMemo ? String(body.deliveryMemo) : undefined,
    amount: Number(body.amount ?? 0),
    items,
  });
  await updateOrderPayResult(String(body.orderId), "결제완료", "points-only");

  return NextResponse.json({ success: true });
}
