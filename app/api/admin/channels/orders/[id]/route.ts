import { NextRequest, NextResponse } from "next/server";
import { updateChannelOrder, deleteChannelOrder } from "@/lib/db-channels";
import { channelOrderStatusValues } from "@/db/schema";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ success: false, errorMessage: "잘못된 요청입니다." }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (b.status != null) {
    if (!channelOrderStatusValues.includes(b.status)) return NextResponse.json({ success: false, errorMessage: "잘못된 상태값입니다." }, { status: 400 });
    patch.status = b.status;
  }
  if (typeof b.courierName === "string") patch.courierName = b.courierName;
  if (typeof b.trackingNumber === "string") patch.trackingNumber = b.trackingNumber;
  if (b.claimLoss != null) patch.claimLoss = Math.max(0, Math.round(Number(b.claimLoss) || 0));
  if (typeof b.supplierOrderNote === "string") patch.supplierOrderNote = b.supplierOrderNote;
  await updateChannelOrder(decodeURIComponent(id), patch);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteChannelOrder(decodeURIComponent(id));
  return NextResponse.json({ success: true });
}
