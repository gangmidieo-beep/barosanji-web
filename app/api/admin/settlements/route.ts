import { NextRequest, NextResponse } from "next/server";
import { updateSettlementStatus } from "@/lib/db-admin-affiliate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const id = String(b?.id ?? "");
  const status = b?.status === "paid" ? "paid" : b?.status === "rejected" ? "rejected" : null;
  if (!id || !status) return NextResponse.json({ success: false, errorMessage: "잘못된 요청" }, { status: 400 });
  await updateSettlementStatus(id, status);
  return NextResponse.json({ success: true });
}
