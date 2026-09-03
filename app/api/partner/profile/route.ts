import { NextRequest, NextResponse } from "next/server";
import { getPartnerId } from "@/lib/partner-session";
import { updatePartnerBank } from "@/lib/db-settlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const partnerId = await getPartnerId();
  if (!partnerId) return NextResponse.json({ success: false, errorMessage: "로그인이 필요해요." }, { status: 401 });
  const b = await req.json().catch(() => null);
  await updatePartnerBank(partnerId, {
    bankName: String(b?.bankName ?? ""),
    bankAccount: String(b?.bankAccount ?? ""),
    bankHolder: String(b?.bankHolder ?? ""),
  });
  return NextResponse.json({ success: true });
}
