import { NextRequest, NextResponse } from "next/server";
import { listAds, addAd, deleteAd, listChannels } from "@/lib/db-channels";
import { kstDateStart, parsePeriod } from "@/lib/channel-period";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const { from, to } = parsePeriod(sp.get("period") ?? "last30", sp.get("from"), sp.get("to"));
  const [ads, channels] = await Promise.all([listAds(from, to), listChannels()]);
  return NextResponse.json({ success: true, ads, channels });
}

/** POST 단건 { channelId, spentOn, amount, productId?, memo? } 또는 { rows: [...] } 일괄 */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const rows: unknown[] = Array.isArray(b?.rows) ? b.rows : b ? [b] : [];
  let saved = 0;
  for (const r of rows as Record<string, unknown>[]) {
    if (!r.channelId || !r.spentOn) continue;
    const amount = Math.round(Number(r.amount) || 0);
    if (amount <= 0) continue;
    await addAd({
      channelId: String(r.channelId),
      spentOn: kstDateStart(String(r.spentOn)),
      amount,
      productId: r.productId ? String(r.productId) : null,
      memo: String(r.memo ?? ""),
    });
    saved++;
  }
  if (!saved) return NextResponse.json({ success: false, errorMessage: "저장할 광고비가 없습니다. 채널·날짜·금액을 확인해주세요." }, { status: 400 });
  return NextResponse.json({ success: true, saved });
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ success: false, errorMessage: "id가 필요합니다." }, { status: 400 });
  await deleteAd(id);
  return NextResponse.json({ success: true });
}
