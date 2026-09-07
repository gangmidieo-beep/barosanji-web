import { NextRequest, NextResponse } from "next/server";
import { listChannelOrders, upsertChannelOrder, listChannels, type NewChannelOrder } from "@/lib/db-channels";
import { parsePeriod } from "@/lib/channel-period";
import { channelOrderStatusValues } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const { from, to } = parsePeriod(sp.get("period") ?? "last30", sp.get("from"), sp.get("to"));
  const [orders, channels] = await Promise.all([
    listChannelOrders({ from, to, channelId: sp.get("channelId") || undefined, status: sp.get("status") || undefined }),
    listChannels(),
  ]);
  return NextResponse.json({ success: true, orders, channels });
}

/** POST 수동 주문 등록 */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.channelId || !b?.externalOrderId) {
    return NextResponse.json({ success: false, errorMessage: "채널과 주문번호는 필수입니다." }, { status: 400 });
  }
  const items = Array.isArray(b.items) ? b.items : [];
  const cleanItems: NewChannelOrder["items"] = items
    .map((it: Record<string, unknown>) => ({
      productId: it.productId ? String(it.productId) : null,
      name: String(it.name ?? "").trim(),
      option: String(it.option ?? ""),
      category: String(it.category ?? ""),
      quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
      unitPrice: Math.max(0, Math.round(Number(it.unitPrice) || 0)),
    }))
    .filter((it: { name: string }) => it.name);
  if (!cleanItems.length) return NextResponse.json({ success: false, errorMessage: "상품을 1개 이상 입력해주세요." }, { status: 400 });
  const status = channelOrderStatusValues.includes(b.status) ? b.status : "신규";
  const orderedAt = b.orderedAt ? new Date(b.orderedAt) : new Date();
  if (Number.isNaN(orderedAt.getTime())) return NextResponse.json({ success: false, errorMessage: "주문일시가 올바르지 않습니다." }, { status: 400 });
  const id = await upsertChannelOrder({
    channelId: String(b.channelId),
    externalOrderId: String(b.externalOrderId).trim(),
    orderedAt,
    status,
    buyerName: String(b.buyerName ?? ""),
    receiverName: String(b.receiverName ?? ""),
    receiverPhone: String(b.receiverPhone ?? ""),
    receiverAddress: String(b.receiverAddress ?? ""),
    deliveryMemo: String(b.deliveryMemo ?? ""),
    shippingFee: Math.max(0, Math.round(Number(b.shippingFee) || 0)),
    claimLoss: Math.max(0, Math.round(Number(b.claimLoss) || 0)),
    source: "manual",
    items: cleanItems,
  });
  return NextResponse.json({ success: true, id });
}
