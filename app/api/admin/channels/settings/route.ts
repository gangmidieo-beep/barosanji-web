import { NextRequest, NextResponse } from "next/server";
import { updateChannel } from "@/lib/db-channels";

/** PATCH { id, monthlyFee?, monthlyFeeThreshold?, settlementDays?, settlementNote?, enabled?, apiStatus? } */
export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.id) return NextResponse.json({ success: false, errorMessage: "id가 필요합니다." }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (b.monthlyFee != null) patch.monthlyFee = Math.max(0, Math.round(Number(b.monthlyFee) || 0));
  if (b.monthlyFeeThreshold != null) patch.monthlyFeeThreshold = Math.max(0, Math.round(Number(b.monthlyFeeThreshold) || 0));
  if (b.settlementDays != null) patch.settlementDays = Math.max(0, Math.round(Number(b.settlementDays) || 0));
  if (typeof b.settlementNote === "string") patch.settlementNote = b.settlementNote;
  if (typeof b.apiStatus === "string") patch.apiStatus = b.apiStatus;
  if (typeof b.enabled === "boolean") patch.enabled = b.enabled;
  await updateChannel(String(b.id), patch);
  return NextResponse.json({ success: true });
}
