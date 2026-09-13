import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { channelProductMappings } from "@/db/schema";
import { SMARTSTORE_CHANNEL_ID } from "@/lib/naver-orders";

/** 스마트스토어 ↔ 바로산지 상품 매칭표 관리 */
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select()
    .from(channelProductMappings)
    .where(eq(channelProductMappings.channelId, SMARTSTORE_CHANNEL_ID));
  return NextResponse.json({ success: true, mappings: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.productId !== "string" || !body.productId) {
    return NextResponse.json({ success: false, errorMessage: "바로산지 상품을 선택해주세요." }, { status: 400 });
  }
  const externalOptionCode = String(body.externalOptionCode ?? "").trim();
  const externalProductId = String(body.externalProductId ?? "").trim();
  if (!externalOptionCode && !externalProductId) {
    return NextResponse.json(
      { success: false, errorMessage: "옵션 관리코드나 스마트스토어 상품번호 중 하나는 있어야 합니다." },
      { status: 400 }
    );
  }
  const [row] = await db
    .insert(channelProductMappings)
    .values({
      channelId: SMARTSTORE_CHANNEL_ID,
      externalOptionCode,
      externalProductId,
      externalOptionName: String(body.externalOptionName ?? "").trim(),
      productId: body.productId,
      optionLabel: String(body.optionLabel ?? "").trim(),
      note: String(body.note ?? "").trim(),
    })
    .returning();
  return NextResponse.json({ success: true, mapping: row });
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isFinite(id)) {
    return NextResponse.json({ success: false, errorMessage: "잘못된 요청입니다." }, { status: 400 });
  }
  await db.delete(channelProductMappings).where(eq(channelProductMappings.id, id));
  return NextResponse.json({ success: true });
}
