import { NextRequest, NextResponse } from "next/server";
import { updateOrderStatus } from "@/lib/db-orders";
import { orderStatusValues } from "@/db/schema";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || !orderStatusValues.includes(body.status)) {
    return NextResponse.json({ success: false, errorMessage: "잘못된 상태값입니다." }, { status: 400 });
  }
  await updateOrderStatus(id, body.status);
  return NextResponse.json({ success: true });
}
