import { NextResponse } from "next/server";
import { getPartnerId } from "@/lib/partner-session";
import { requestSettlement } from "@/lib/db-settlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const partnerId = await getPartnerId();
  if (!partnerId) return NextResponse.json({ success: false, errorMessage: "로그인이 필요해요." }, { status: 401 });
  const r = await requestSettlement(partnerId);
  if (!r.ok) return NextResponse.json({ success: false, errorMessage: r.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
