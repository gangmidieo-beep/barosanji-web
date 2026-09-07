import { NextRequest, NextResponse } from "next/server";
import { setChannelPrice } from "@/lib/db-pricing";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";

/** PUT { channelId, productId, price } — 판매가 직접 수정 */
export async function PUT(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.channelId || !b?.productId) return NextResponse.json({ success: false, errorMessage: "잘못된 요청입니다." }, { status: 400 });
  const price = Math.max(0, Math.round(Number(b.price) || 0));
  if (price <= 0) return NextResponse.json({ success: false, errorMessage: "판매가를 입력해주세요." }, { status: 400 });
  if (b.channelId === "barosanji") {
    await db.update(products).set({ price, updatedAt: new Date() }).where(eq(products.id, String(b.productId)));
  } else {
    await setChannelPrice(String(b.channelId), String(b.productId), price, "manual");
  }
  return NextResponse.json({ success: true });
}
