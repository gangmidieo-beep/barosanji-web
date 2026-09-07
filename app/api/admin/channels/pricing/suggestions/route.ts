import { NextRequest, NextResponse } from "next/server";
import { generateSuggestions, listSuggestions, approveSuggestions, rejectSuggestions } from "@/lib/db-pricing";
import { priceSuggestionStatusValues, type PriceSuggestionStatus } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const s = req.nextUrl.searchParams.get("status") ?? "대기";
  const status = (priceSuggestionStatusValues as readonly string[]).includes(s) ? (s as PriceSuggestionStatus) : "전체";
  const suggestions = await listSuggestions(status);
  return NextResponse.json({ success: true, suggestions });
}

/** POST — 제안 생성 { channelIds?, productIds? } */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const result = await generateSuggestions({
    channelIds: Array.isArray(b?.channelIds) ? b.channelIds.map(String) : undefined,
    productIds: Array.isArray(b?.productIds) ? b.productIds.map(String) : undefined,
  });
  return NextResponse.json({ success: true, ...result });
}

/** PATCH — 승인/보류 { ids: number[], action: "approve" | "reject" } */
export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const ids = Array.isArray(b?.ids) ? b.ids.map(Number).filter(Number.isFinite) : [];
  if (!ids.length) return NextResponse.json({ success: false, errorMessage: "선택된 제안이 없습니다." }, { status: 400 });
  const applied = b.action === "reject" ? await rejectSuggestions(ids) : await approveSuggestions(ids);
  return NextResponse.json({ success: true, applied });
}
