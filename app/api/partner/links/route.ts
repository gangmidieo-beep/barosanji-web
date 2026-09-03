import { NextRequest, NextResponse } from "next/server";
import { getPartnerId } from "@/lib/partner-session";
import { createProductLink } from "@/lib/db-partner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const partnerId = await getPartnerId();
  if (!partnerId) return NextResponse.json({ success: false, errorMessage: "로그인이 필요해요." }, { status: 401 });
  const b = await req.json().catch(() => null);
  const productId = String(b?.productId ?? "");
  if (!productId) return NextResponse.json({ success: false, errorMessage: "상품을 선택해주세요." }, { status: 400 });
  const r = await createProductLink(partnerId, productId);
  return NextResponse.json({ success: true, code: r.code });
}
