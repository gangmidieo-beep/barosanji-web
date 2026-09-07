/**
 * 원물 시세 대응 판매가 계산 엔진 (순수 함수 — DB 접근 없음)
 *
 * 원물(농수산물)은 산지 시세에 따라 매입가가 수시로 바뀐다. 매입가만 바뀌고 판매가를
 * 그대로 두면 마진이 녹거나 역마진이 나므로, 목표 마진율에서 판매가를 역산한다.
 *
 * 순마진 = 판매가 − 채널수수료(판매가 × 수수료율) − 원가
 * 목표마진율 = 순마진 / 판매가
 *   ⇒ 원가/판매가 = 1 − 수수료율 − 목표마진율
 *   ⇒ 판매가 = 원가 / (1 − 수수료율 − 목표마진율)
 *
 * 계산된 값은 그대로 쓰지 않고 가드레일(최저가·최고가·최대변동폭)과 끝자리 정리를 거친다.
 */

export type PricingRule = {
  productId: string;
  targetMarginRate: number;
  minPrice: number;
  maxPrice: number;
  maxChangeRate: number;
  roundTo: number;
  roundEndsWith: number;
  autoSuggest: boolean;
  seasonStart: string; // "MM-DD"
  seasonEnd: string;
};

export const DEFAULT_RULE: Omit<PricingRule, "productId"> = {
  targetMarginRate: 0.2,
  minPrice: 0,
  maxPrice: 0,
  maxChangeRate: 0.3,
  roundTo: 1000,
  roundEndsWith: 900,
  autoSuggest: true,
  seasonStart: "",
  seasonEnd: "",
};

/** 주문 1건당 원가 (매입가 + 포장비 + 택배비). 판매가 역산의 기준값 */
export type CostInput = {
  costPrice: number;
  packagingCost: number;
  shippingCost: number;
};

export function totalUnitCost(c: CostInput): number {
  return c.costPrice + c.packagingCost + c.shippingCost;
}

/**
 * 끝자리 정리. roundTo=1000, roundEndsWith=900 이면 34,231 → 34,900 (올림 기준).
 * 마진이 깎이지 않도록 항상 올림 방향으로 맞춘다.
 */
export function roundPrice(raw: number, roundTo: number, roundEndsWith: number): number {
  if (roundTo <= 0) return Math.round(raw);
  const ends = Math.max(0, Math.min(roundEndsWith, roundTo - 1));
  const base = Math.floor(raw / roundTo) * roundTo;
  const candidate = base + ends;
  return candidate >= raw ? candidate : candidate + roundTo;
}

/** 판매가에서 실제 순마진율을 계산 */
export function marginAt(price: number, cost: number, feeRate: number): number {
  if (price <= 0) return 0;
  return (price - price * feeRate - cost) / price;
}

export type PriceSuggestion = {
  /** 가드레일 적용 후 최종 권장가 */
  price: number;
  /** 가드레일 적용 전 이론값 */
  rawPrice: number;
  margin: number;
  currentMargin: number;
  /** 가드레일에 걸렸다면 사유 */
  capped: string;
  /** 계산 불가 사유 (있으면 제안하지 않음) */
  error: string;
};

/**
 * 권장 판매가 계산.
 * @param cost   주문 1건당 총원가
 * @param feeRate 채널 실질 수수료율 (판매수수료+결제수수료, 부가세 반영 후)
 * @param currentPrice 현재 판매가 (0이면 신규)
 */
export function suggestPrice(
  cost: number,
  feeRate: number,
  currentPrice: number,
  rule: Pick<PricingRule, "targetMarginRate" | "minPrice" | "maxPrice" | "maxChangeRate" | "roundTo" | "roundEndsWith">
): PriceSuggestion {
  const currentMargin = currentPrice > 0 ? marginAt(currentPrice, cost, feeRate) : 0;
  const empty = { price: 0, rawPrice: 0, margin: 0, currentMargin, capped: "", error: "" };

  if (cost <= 0) return { ...empty, error: "원가 미입력" };

  const denom = 1 - feeRate - rule.targetMarginRate;
  if (denom <= 0.02) {
    return {
      ...empty,
      error: `수수료(${(feeRate * 100).toFixed(1)}%) + 목표마진(${(rule.targetMarginRate * 100).toFixed(0)}%)이 100%에 너무 가까워 계산 불가. 목표마진율을 낮춰주세요`,
    };
  }

  const rawPrice = cost / denom;
  let price = roundPrice(rawPrice, rule.roundTo, rule.roundEndsWith);
  const caps: string[] = [];

  // 가드레일 — 오입력·시세 급등락으로 가격이 튀는 것을 막는다
  if (rule.maxChangeRate > 0 && currentPrice > 0) {
    const upper = Math.round(currentPrice * (1 + rule.maxChangeRate));
    const lower = Math.round(currentPrice * (1 - rule.maxChangeRate));
    if (price > upper) {
      price = roundPrice(upper, rule.roundTo, rule.roundEndsWith);
      caps.push(`1회 변동폭 ${(rule.maxChangeRate * 100).toFixed(0)}% 제한`);
    } else if (price < lower) {
      price = roundPrice(lower, rule.roundTo, rule.roundEndsWith);
      caps.push(`1회 변동폭 ${(rule.maxChangeRate * 100).toFixed(0)}% 제한`);
    }
  }
  if (rule.minPrice > 0 && price < rule.minPrice) {
    price = rule.minPrice;
    caps.push("최저 판매가 적용");
  }
  if (rule.maxPrice > 0 && price > rule.maxPrice) {
    price = rule.maxPrice;
    caps.push("최고 판매가 적용");
  }

  return {
    price,
    rawPrice: Math.round(rawPrice),
    margin: marginAt(price, cost, feeRate),
    currentMargin,
    capped: caps.join(", "),
    error: "",
  };
}

/** 오늘이 판매 시즌 안인지 (MM-DD 기준, 연말 넘어가는 시즌도 처리) */
export function inSeason(rule: Pick<PricingRule, "seasonStart" | "seasonEnd">, today: Date = new Date()): boolean {
  const s = rule.seasonStart.trim();
  const e = rule.seasonEnd.trim();
  if (!s || !e) return true; // 연중 판매
  const k = new Date(today.getTime() + 9 * 60 * 60 * 1000);
  const md = `${String(k.getUTCMonth() + 1).padStart(2, "0")}-${String(k.getUTCDate()).padStart(2, "0")}`;
  return s <= e ? md >= s && md <= e : md >= s || md <= e; // 11-01~02-28 같은 겨울 시즌
}

export type MarginAlertLevel = "역마진" | "저마진" | "정상";

export function marginAlertLevel(margin: number, target: number): MarginAlertLevel {
  if (margin < 0) return "역마진";
  if (margin < target * 0.5) return "저마진";
  return "정상";
}
