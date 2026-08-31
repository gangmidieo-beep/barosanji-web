import { NextRequest, NextResponse } from "next/server";
import { updateOrderStatus, updateOrderTracking } from "@/lib/db-orders";
import { orderStatusValues } from "@/db/schema";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false, errorMessage: "잘못된 요청입니다." }, { status: 400 });

  // 송장번호/택배사만 바꾸는 경우
  if (typeof body.trackingNumber === "string" || typeof body.courierName === "string") {
    await updateOrderTracking(id, body.courierName ?? "", body.trackingNumber ?? "");
    return NextResponse.json({ success: true });
  }

  if (!orderStatusValues.includes(body.status)) {
    return NextResponse.json({ success: false, errorMessage: "잘못된 상태값입니다." }, { status: 400 });
  }
  await updateOrderStatus(id, body.status);
  return NextResponse.json({ success: true });
}
