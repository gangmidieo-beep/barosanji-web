import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  productPricingRules,
  channelProductPrices,
  priceSuggestions,
  marketPrices,
  productCosts,
  channels,
  channelFeeRules,
  products,
  type PriceSuggestionStatus,
} from "@/db/schema";
import {
  suggestPrice,
  totalUnitCost,
  marginAt,
  inSeason,
  marginAlertLevel,
  DEFAULT_RULE,
  type PricingRule,
  type MarginAlertLevel,
} from "./pricing";
import { pickFeeRule } from "./channel-profit";

export type PricingRuleRow = typeof productPricingRules.$inferSelect;
export type ChannelPriceRow = typeof channelProductPrices.$inferSelect;
export type SuggestionRow = typeof priceSuggestions.$inferSelect;

// ---------- 가격 규칙 ----------
export async function listPricingRules(): Promise<PricingRuleRow[]> {
  return db.select().from(productPricingRules).orderBy(asc(productPricingRules.productId));
}

export async function upsertPricingRule(input: Partial<PricingRuleRow> & { productId: string }) {
  const values = {
    productId: input.productId,
    targetMarginRate: input.targetMarginRate ?? DEFAULT_RULE.targetMarginRate,
    minPrice: input.minPrice ?? 0,
    maxPrice: input.maxPrice ?? 0,
    maxChangeRate: input.maxChangeRate ?? DEFAULT_RULE.maxChangeRate,
    roundTo: input.roundTo ?? DEFAULT_RULE.roundTo,
    roundEndsWith: input.roundEndsWith ?? DEFAULT_RULE.roundEndsWith,
    autoSuggest: input.autoSuggest ?? true,
    seasonStart: input.seasonStart ?? "",
    seasonEnd: input.seasonEnd ?? "",
    note: input.note ?? "",
    updatedAt: new Date(),
  };
  await db.insert(productPricingRules).values(values).onConflictDoUpdate({ target: productPricingRules.productId, set: values });
}

// ---------- 채널 판매가 ----------
export async function listChannelPrices(): Promise<ChannelPriceRow[]> {
  return db.select().from(channelProductPrices);
}

export async function setChannelPrice(channelId: string, productId: string, price: number, source = "manual") {
  const id = `${channelId}:${productId}`;
  const values = { id, channelId, productId, price, appliedAt: new Date(), source };
  await db.insert(channelProductPrices).values(values).onConflictDoUpdate({
    target: channelProductPrices.id,
    set: { price, appliedAt: new Date(), source },
  });
}

// ---------- 현재 상태 스냅샷 ----------
export type PriceStatusRow = {
  productId: string;
  productName: string;
  category: string;
  unit: string;
  cost: number;
  costPrice: number;
  hasCost: boolean;
  rule: PricingRule;
  inSeason: boolean;
  channels: {
    channelId: string;
    channelName: string;
    price: number;
    feeRate: number;
    margin: number;
    level: MarginAlertLevel;
    hasPrice: boolean;
  }[];
  worstLevel: MarginAlertLevel;
};

/** 채널 실질 수수료율 (판매수수료+결제수수료, 부가세 반영) */
function effectiveFeeRate(rules: { channelId: string; category: string; saleRate: number; paymentRate: number; vatOnFee: boolean; effectiveFrom: Date }[], channelId: string, category: string, at: Date): number {
  const r = pickFeeRule(rules, channelId, category, at);
  if (!r) return 0;
  return (r.saleRate + r.paymentRate) * (r.vatOnFee ? 1.1 : 1);
}

export async function getPriceStatus(): Promise<PriceStatusRow[]> {
  const now = new Date();
  const [prods, costRows, ruleRows, feeRows, chRows, priceRows] = await Promise.all([
    db.select({ id: products.id, name: products.name, category: products.category, unit: products.unit, price: products.price }).from(products).orderBy(asc(products.name)),
    db.select().from(productCosts).orderBy(desc(productCosts.effectiveFrom), desc(productCosts.id)),
    listPricingRules(),
    db.select().from(channelFeeRules),
    db.select().from(channels).where(eq(channels.enabled, true)).orderBy(asc(channels.sortOrder)),
    listChannelPrices(),
  ]);

  const ruleByProduct = new Map(ruleRows.map((r) => [r.productId, r]));
  const priceByKey = new Map(priceRows.map((p) => [p.id, p]));
  const feeInputs = feeRows.map((r) => ({ channelId: r.channelId, category: r.category, saleRate: r.saleRate, paymentRate: r.paymentRate, vatOnFee: r.vatOnFee, effectiveFrom: r.effectiveFrom }));

  // 상품별 현재 유효 원가 (정렬이 최신순이라 첫 번째가 현재값)
  const costByProduct = new Map<string, typeof costRows[number]>();
  for (const c of costRows) {
    if (c.effectiveFrom.getTime() > now.getTime()) continue;
    if (!costByProduct.has(c.productId)) costByProduct.set(c.productId, c);
  }

  return prods.map((p) => {
    const c = costByProduct.get(p.id);
    const cost = c ? totalUnitCost(c) : 0;
    const dbRule = ruleByProduct.get(p.id);
    const rule: PricingRule = {
      productId: p.id,
      targetMarginRate: dbRule?.targetMarginRate ?? DEFAULT_RULE.targetMarginRate,
      minPrice: dbRule?.minPrice ?? 0,
      maxPrice: dbRule?.maxPrice ?? 0,
      maxChangeRate: dbRule?.maxChangeRate ?? DEFAULT_RULE.maxChangeRate,
      roundTo: dbRule?.roundTo ?? DEFAULT_RULE.roundTo,
      roundEndsWith: dbRule?.roundEndsWith ?? DEFAULT_RULE.roundEndsWith,
      autoSuggest: dbRule?.autoSuggest ?? true,
      seasonStart: dbRule?.seasonStart ?? "",
      seasonEnd: dbRule?.seasonEnd ?? "",
    };

    const chList = chRows.map((ch) => {
      // 자사몰은 products.price를 그대로 사용
      const stored = priceByKey.get(`${ch.id}:${p.id}`);
      const price = ch.id === "barosanji" ? p.price : stored?.price ?? 0;
      const feeRate = effectiveFeeRate(feeInputs, ch.id, p.category, now);
      const margin = price > 0 && cost > 0 ? marginAt(price, cost, feeRate) : 0;
      return {
        channelId: ch.id,
        channelName: ch.name,
        price,
        feeRate,
        margin,
        level: price > 0 && cost > 0 ? marginAlertLevel(margin, rule.targetMarginRate) : ("정상" as MarginAlertLevel),
        hasPrice: price > 0,
      };
    });

    const worst: MarginAlertLevel = chList.some((x) => x.level === "역마진")
      ? "역마진"
      : chList.some((x) => x.level === "저마진")
        ? "저마진"
        : "정상";

    return {
      productId: p.id,
      productName: p.name,
      category: p.category,
      unit: p.unit,
      cost,
      costPrice: c?.costPrice ?? 0,
      hasCost: Boolean(c),
      rule,
      inSeason: inSeason(rule, now),
      channels: chList,
      worstLevel: worst,
    };
  });
}

// ---------- 가격 제안 ----------
export type GenerateResult = { batchId: string; created: number; skipped: { productId: string; reason: string }[] };

/** 현재 원가·수수료 기준으로 목표 마진에 맞는 판매가를 계산해 제안으로 쌓는다 */
export async function generateSuggestions(opts: { channelIds?: string[]; productIds?: string[]; onlyOffTarget?: boolean } = {}): Promise<GenerateResult> {
  const status = await getPriceStatus();
  const batchId = `B${Date.now()}`;
  const rows: (typeof priceSuggestions.$inferInsert)[] = [];
  const skipped: { productId: string; reason: string }[] = [];

  for (const s of status) {
    if (opts.productIds?.length && !opts.productIds.includes(s.productId)) continue;
    if (!s.rule.autoSuggest) continue;
    if (!s.hasCost) {
      skipped.push({ productId: s.productId, reason: "원가 미입력" });
      continue;
    }
    for (const ch of s.channels) {
      if (opts.channelIds?.length && !opts.channelIds.includes(ch.channelId)) continue;
      // 아직 그 채널에 판매가를 정하지 않았다면, 채널을 명시적으로 고른 경우에만 신규 제안
      if (!ch.hasPrice && !opts.channelIds?.length) continue;
      const res = suggestPrice(s.cost, ch.feeRate, ch.price, s.rule);
      if (res.error) {
        skipped.push({ productId: s.productId, reason: `${ch.channelName}: ${res.error}` });
        continue;
      }
      if (ch.hasPrice && res.price === ch.price) continue; // 바꿀 게 없음
      // 목표 마진에서 1%p 이내로 이미 맞으면 건드리지 않음 (잦은 가격 변경 방지)
      if (opts.onlyOffTarget !== false && ch.hasPrice && Math.abs(ch.margin - s.rule.targetMarginRate) < 0.01) continue;

      const diff = ch.hasPrice ? res.price - ch.price : 0;
      const reason = !ch.hasPrice
        ? "신규 판매가 (미설정)"
        : ch.margin < 0
          ? `역마진 ${(ch.margin * 100).toFixed(1)}% → 목표 ${(s.rule.targetMarginRate * 100).toFixed(0)}%`
          : `마진 ${(ch.margin * 100).toFixed(1)}% → 목표 ${(s.rule.targetMarginRate * 100).toFixed(0)}% (${diff > 0 ? "인상" : "인하"})`;

      rows.push({
        batchId,
        channelId: ch.channelId,
        productId: s.productId,
        productName: s.productName,
        currentPrice: ch.price,
        suggestedPrice: res.price,
        costPrice: s.cost,
        feeRate: ch.feeRate,
        currentMargin: ch.margin,
        suggestedMargin: res.margin,
        reason,
        capped: res.capped,
        status: "대기" as PriceSuggestionStatus,
      });
    }
  }

  if (rows.length) await db.insert(priceSuggestions).values(rows);
  return { batchId, created: rows.length, skipped };
}

export async function listSuggestions(status: PriceSuggestionStatus | "전체" = "대기"): Promise<SuggestionRow[]> {
  const q = db.select().from(priceSuggestions);
  const rows = status === "전체" ? await q.orderBy(desc(priceSuggestions.createdAt)).limit(500) : await q.where(eq(priceSuggestions.status, status)).orderBy(desc(priceSuggestions.createdAt)).limit(500);
  return rows;
}

/** 제안 승인 → 채널 판매가에 실제 반영 */
export async function approveSuggestions(ids: number[]): Promise<number> {
  if (!ids.length) return 0;
  const rows = await db.select().from(priceSuggestions).where(and(inArray(priceSuggestions.id, ids), eq(priceSuggestions.status, "대기")));
  for (const r of rows) {
    if (r.channelId === "barosanji") {
      await db.update(products).set({ price: r.suggestedPrice, updatedAt: new Date() }).where(eq(products.id, r.productId));
    } else {
      await setChannelPrice(r.channelId, r.productId, r.suggestedPrice, "suggestion");
    }
  }
  if (rows.length) {
    await db.update(priceSuggestions).set({ status: "승인", decidedAt: new Date() }).where(inArray(priceSuggestions.id, rows.map((r) => r.id)));
  }
  return rows.length;
}

export async function rejectSuggestions(ids: number[]): Promise<number> {
  if (!ids.length) return 0;
  const res = await db.update(priceSuggestions).set({ status: "보류", decidedAt: new Date() }).where(and(inArray(priceSuggestions.id, ids), eq(priceSuggestions.status, "대기"))).returning({ id: priceSuggestions.id });
  return res.length;
}

// ---------- 원가 일괄 조정 ----------
/** 선택 상품들의 현재 매입가에 비율을 곱해 새 원가 이력을 만든다 (예: 겨울 시세 +15%) */
export async function bulkAdjustCosts(input: { productIds: string[]; rate: number; effectiveFrom: Date; note: string }): Promise<number> {
  const status = await getPriceStatus();
  const now = new Date();
  const costRows = await db.select().from(productCosts).orderBy(desc(productCosts.effectiveFrom), desc(productCosts.id));
  const currentByProduct = new Map<string, typeof costRows[number]>();
  for (const c of costRows) {
    if (c.effectiveFrom.getTime() > now.getTime()) continue;
    if (!currentByProduct.has(c.productId)) currentByProduct.set(c.productId, c);
  }
  const values: (typeof productCosts.$inferInsert)[] = [];
  for (const pid of input.productIds) {
    const c = currentByProduct.get(pid);
    if (!c) continue;
    values.push({
      productId: pid,
      costPrice: Math.max(0, Math.round(c.costPrice * (1 + input.rate))),
      shippingCost: c.shippingCost,
      packagingCost: c.packagingCost,
      effectiveFrom: input.effectiveFrom,
      note: input.note,
    });
  }
  if (values.length) await db.insert(productCosts).values(values);
  void status;
  return values.length;
}

// ---------- 시세 참고 ----------
export async function listMarketPrices(itemName?: string) {
  const q = db.select().from(marketPrices);
  return itemName ? q.where(eq(marketPrices.itemName, itemName)).orderBy(desc(marketPrices.surveyedOn)).limit(200) : q.orderBy(desc(marketPrices.surveyedOn)).limit(200);
}

export async function saveMarketPrices(rows: { itemName: string; grade?: string; unit?: string; price: number; surveyedOn: Date; source?: string }[]) {
  if (!rows.length) return 0;
  await db.insert(marketPrices).values(rows.map((r) => ({ itemName: r.itemName, grade: r.grade ?? "", unit: r.unit ?? "", price: r.price, surveyedOn: r.surveyedOn, source: r.source ?? "kamis" })));
  return rows.length;
}

void sql;
