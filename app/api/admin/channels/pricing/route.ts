import { NextResponse } from "next/server";
import { getPriceStatus } from "@/lib/db-pricing";

export const dynamic = "force-dynamic";

/** GET — 상품별 원가·채널 판매가·마진 현황 (마진 경보의 원천) */
export async function GET() {
  const rows = await getPriceStatus();
  return NextResponse.json({ success: true, rows });
}
