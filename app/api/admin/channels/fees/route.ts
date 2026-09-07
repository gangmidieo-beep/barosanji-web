import { NextRequest, NextResponse } from "next/server";
import { listFeeRules, addFeeRule, deleteFeeRule, listChannels } from "@/lib/db-channels";
import { kstDateStart } from "@/lib/channel-period";

export const dynamic = "force-dynamic";

export async function GET() {
  const [rules, channels] = await Promise.all([listFeeRules(), listChannels()]);
  return NextResponse.json({ success: true, rules, channels });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.channelId) return NextResponse.json({ success: false, errorMessage: "채널을 선택해주세요." }, { status: 400 });
  const saleRate = Number(b.salePct ?? 0) / 100;
  const paymentRate = Number(b.paymentPct ?? 0) / 100;
  if (!(saleRate >= 0 && saleRate < 1 && paymentRate >= 0 && paymentRate < 1)) {
    return NextResponse.json({ success: false, errorMessage: "수수료율은 0~99% 사이로 입력해주세요." }, { status: 400 });
  }
  const rule = await addFeeRule({
    channelId: String(b.channelId),
    category: String(b.category || "*").trim() || "*",
    saleRate,
    paymentRate,
    vatOnFee: Boolean(b.vatOnFee),
    effectiveFrom: b.effectiveFrom ? kstDateStart(String(b.effectiveFrom)) : new Date(),
    note: String(b.note ?? ""),
  });
  return NextResponse.json({ success: true, rule });
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ success: false, errorMessage: "id가 필요합니다." }, { status: 400 });
  await deleteFeeRule(id);
  return NextResponse.json({ success: true });
}
