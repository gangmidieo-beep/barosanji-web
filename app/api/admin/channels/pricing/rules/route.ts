import { NextRequest, NextResponse } from "next/server";
import { upsertPricingRule } from "@/lib/db-pricing";

const clampRate = (v: unknown, def: number, max = 0.95) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(0, Math.min(max, n));
};
const MMDD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** PUT { productId, targetMarginPct, minPrice, maxPrice, maxChangePct, roundTo, roundEndsWith, autoSuggest, seasonStart, seasonEnd, note } */
export async function PUT(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.productId) return NextResponse.json({ success: false, errorMessage: "상품을 지정해주세요." }, { status: 400 });

  const seasonStart = String(b.seasonStart ?? "").trim();
  const seasonEnd = String(b.seasonEnd ?? "").trim();
  if ((seasonStart && !MMDD.test(seasonStart)) || (seasonEnd && !MMDD.test(seasonEnd))) {
    return NextResponse.json({ success: false, errorMessage: "판매 시즌은 MM-DD 형식으로 입력해주세요. (예: 09-01)" }, { status: 400 });
  }
  if (Boolean(seasonStart) !== Boolean(seasonEnd)) {
    return NextResponse.json({ success: false, errorMessage: "판매 시즌은 시작일과 종료일을 함께 입력해주세요." }, { status: 400 });
  }

  const roundTo = Math.max(0, Math.round(Number(b.roundTo) || 0));
  const roundEndsWith = Math.max(0, Math.round(Number(b.roundEndsWith) || 0));
  if (roundTo > 0 && roundEndsWith >= roundTo) {
    return NextResponse.json({ success: false, errorMessage: "끝자리 값은 정리 단위보다 작아야 합니다. (예: 단위 1000, 끝자리 900)" }, { status: 400 });
  }

  await upsertPricingRule({
    productId: String(b.productId),
    targetMarginRate: clampRate(Number(b.targetMarginPct) / 100, 0.2),
    minPrice: Math.max(0, Math.round(Number(b.minPrice) || 0)),
    maxPrice: Math.max(0, Math.round(Number(b.maxPrice) || 0)),
    maxChangeRate: clampRate(Number(b.maxChangePct) / 100, 0.3, 5),
    roundTo,
    roundEndsWith,
    autoSuggest: b.autoSuggest !== false,
    seasonStart,
    seasonEnd,
    note: String(b.note ?? ""),
  });
  return NextResponse.json({ success: true });
}
