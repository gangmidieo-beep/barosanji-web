/**
 * 멀티채널 수익 계산 엔진 (순수 함수 — DB 접근 없음, 테스트 가능)
 *
 * 주문 1건 기준:
 *   매출       = Σ(판매가 × 수량) + 고객부담 배송비
 *   채널수수료 = 판매수수료 + 결제수수료 (+ 부가세 10%, 채널 설정에 따라) + 월 고정비 배분
 *   원가       = Σ((매입가 + 포장비) × 수량) + 공급업체 택배비(주문당 1회)
 *   광고비     = 채널·날짜별 광고비를 그날 주문 매출 비율로 배분 (상품 지정 광고비는 그 상품 주문에만)
 *   순수익     = 매출 − 수수료 − 원가 − 광고비 − 클레임 손실
 *   정산예정액 = 매출 − 수수료 (채널 정산일수만큼 뒤 입금 예정)
 */

export type FeeRule = {
  channelId: string;
  category: string; // "*" = 기본
  saleRate: number;
  paymentRate: number;
  vatOnFee: boolean;
  effectiveFrom: Date;
};

export type CostRule = {
  productId: string;
  costPrice: number;
  shippingCost: number;
  packagingCost: number;
  effectiveFrom: Date;
};

export type ChannelInfo = {
  id: string;
  name: string;
  monthlyFee: number;
  monthlyFeeThreshold: number;
  settlementDays: number;
};

export type OrderLine = {
  productId: string | null;
  name?: string;
  category: string;
  quantity: number;
  unitPrice: number;
};

export type OrderInput = {
  id: string;
  channelId: string;
  orderedAt: Date;
  status: string;
  shippingFee: number;
  claimLoss: number;
  items: OrderLine[];
};

export type AdSpend = {
  channelId: string;
  spentOn: Date;
  amount: number;
  productId: string | null;
};

export type OrderProfit = {
  id: string;
  channelId: string;
  orderedAt: Date;
  status: string;
  cancelled: boolean;
  revenue: number;
  fee: number;
  fixedFeeShare: number;
  cost: number;
  adCost: number;
  claimLoss: number;
  profit: number;
  settlementAmount: number;
  settlementDueAt: Date;
  /** 원가가 입력되지 않은 상품이 포함된 주문 (순수익이 과대 계산됨) */
  missingCost: boolean;
  itemCount: number;
};

export type ChannelSummary = {
  channelId: string;
  channelName: string;
  orderCount: number;
  cancelledCount: number;
  itemCount: number;
  revenue: number;
  fee: number;
  cost: number;
  adCost: number;
  claimLoss: number;
  profit: number;
  /** 순수익률 (매출 대비, 0.23 = 23%) */
  margin: number;
  missingCostOrders: number;
  settlementPending: number;
};

export const CANCELLED_STATUSES = new Set(["취소", "반품", "결제취소", "결제대기"]);

const DAY = 24 * 60 * 60 * 1000;
export const KST_OFFSET = 9 * 60 * 60 * 1000;

/** KST 기준 YYYY-MM-DD 키 */
export function dayKey(d: Date): string {
  const k = new Date(d.getTime() + KST_OFFSET);
  return `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, "0")}-${String(k.getUTCDate()).padStart(2, "0")}`;
}
export function monthKey(d: Date): string {
  return dayKey(d).slice(0, 7);
}

/** 주문 시점에 유효한 규칙 중 가장 최근 것을 고른다 (카테고리 일치 우선, 없으면 "*") */
export function pickFeeRule(rules: FeeRule[], channelId: string, category: string, at: Date): FeeRule | null {
  let best: FeeRule | null = null;
  let bestIsExact = false;
  for (const r of rules) {
    if (r.channelId !== channelId) continue;
    if (r.effectiveFrom.getTime() > at.getTime()) continue;
    const exact = r.category === category && category !== "";
    if (!exact && r.category !== "*") continue;
    if (
      !best ||
      (exact && !bestIsExact) ||
      (exact === bestIsExact && r.effectiveFrom.getTime() > best.effectiveFrom.getTime())
    ) {
      best = r;
      bestIsExact = exact;
    }
  }
  return best;
}

export function pickCostRule(costs: CostRule[], productId: string | null, at: Date): CostRule | null {
  if (!productId) return null;
  const base = productId.split("::")[0]; // 옵션 접미사 제거
  let best: CostRule | null = null;
  for (const c of costs) {
    if (c.productId !== productId && c.productId !== base) continue;
    if (c.effectiveFrom.getTime() > at.getTime()) continue;
    if (!best || c.effectiveFrom.getTime() > best.effectiveFrom.getTime()) best = c;
  }
  return best;
}

export function calcRevenue(order: OrderInput): number {
  return order.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0) + order.shippingFee;
}

export function calcFee(order: OrderInput, rules: FeeRule[]): number {
  let fee = 0;
  for (const it of order.items) {
    const rule = pickFeeRule(rules, order.channelId, it.category, order.orderedAt);
    if (!rule) continue;
    const line = it.unitPrice * it.quantity;
    let f = line * rule.saleRate + line * rule.paymentRate;
    if (rule.vatOnFee) f *= 1.1;
    fee += f;
  }
  // 배송비에도 결제수수료는 붙는다 (기본 규칙 기준)
  if (order.shippingFee > 0) {
    const rule = pickFeeRule(rules, order.channelId, "*", order.orderedAt);
    if (rule) {
      let f = order.shippingFee * (rule.saleRate + rule.paymentRate);
      if (rule.vatOnFee) f *= 1.1;
      fee += f;
    }
  }
  return Math.round(fee);
}

export function calcCost(order: OrderInput, costs: CostRule[]): { cost: number; missing: boolean } {
  let cost = 0;
  let missing = false;
  let shipping = 0;
  for (const it of order.items) {
    const c = pickCostRule(costs, it.productId, order.orderedAt);
    if (!c) {
      missing = true;
      continue;
    }
    cost += (c.costPrice + c.packagingCost) * it.quantity;
    shipping = Math.max(shipping, c.shippingCost); // 한 주문은 택배 1건으로 가정
  }
  return { cost: cost + shipping, missing };
}

/**
 * 광고비 배분 — 채널·날짜(KST)별 광고비를 그날의 유효 주문 매출 비율로 나눈다.
 * 상품이 지정된 광고비는 그 상품이 포함된 주문에만 배분. 해당일 주문이 없으면 "미배분 광고비"로 남긴다.
 */
export function allocateAds(
  orders: (OrderInput & { revenue: number; cancelled: boolean })[],
  ads: AdSpend[]
): { byOrder: Map<string, number>; unallocated: Map<string, number> } {
  const byOrder = new Map<string, number>();
  const unallocated = new Map<string, number>();
  const groups = new Map<string, typeof orders>();
  for (const o of orders) {
    if (o.cancelled) continue;
    const k = `${o.channelId}|${dayKey(o.orderedAt)}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(o);
  }
  for (const ad of ads) {
    const k = `${ad.channelId}|${dayKey(ad.spentOn)}`;
    let targets = groups.get(k) ?? [];
    if (ad.productId) {
      const base = ad.productId.split("::")[0];
      targets = targets.filter((o) => o.items.some((it) => (it.productId ?? "").split("::")[0] === base));
    }
    const total = targets.reduce((s, o) => s + o.revenue, 0);
    if (targets.length === 0 || total <= 0) {
      unallocated.set(ad.channelId, (unallocated.get(ad.channelId) ?? 0) + ad.amount);
      continue;
    }
    let assigned = 0;
    targets.forEach((o, i) => {
      const share = i === targets.length - 1 ? ad.amount - assigned : Math.round((ad.amount * o.revenue) / total);
      assigned += share;
      byOrder.set(o.id, (byOrder.get(o.id) ?? 0) + share);
    });
  }
  return { byOrder, unallocated };
}

/** 월 고정비 배분 — 채널·월 매출이 기준을 넘으면 그 달 유효 주문에 균등 배분 */
export function allocateFixedFees(
  orders: (OrderInput & { revenue: number; cancelled: boolean })[],
  channels: ChannelInfo[]
): Map<string, number> {
  const out = new Map<string, number>();
  const byChannel = new Map<string, ChannelInfo>(channels.map((c) => [c.id, c]));
  const groups = new Map<string, typeof orders>();
  for (const o of orders) {
    if (o.cancelled) continue;
    const k = `${o.channelId}|${monthKey(o.orderedAt)}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(o);
  }
  for (const [k, list] of groups) {
    const ch = byChannel.get(k.split("|")[0]);
    if (!ch || ch.monthlyFee <= 0) continue;
    const monthRevenue = list.reduce((s, o) => s + o.revenue, 0);
    if (monthRevenue < ch.monthlyFeeThreshold) continue;
    const per = Math.round(ch.monthlyFee / list.length);
    for (const o of list) out.set(o.id, per);
  }
  return out;
}

export function computeOrderProfits(
  orders: OrderInput[],
  rules: FeeRule[],
  costs: CostRule[],
  ads: AdSpend[],
  channels: ChannelInfo[]
): { orders: OrderProfit[]; unallocatedAds: Map<string, number> } {
  const chMap = new Map(channels.map((c) => [c.id, c]));
  const pre = orders.map((o) => ({ ...o, revenue: calcRevenue(o), cancelled: CANCELLED_STATUSES.has(o.status) }));
  const adAlloc = allocateAds(pre, ads);
  const fixed = allocateFixedFees(pre, channels);

  const result: OrderProfit[] = pre.map((o) => {
    const ch = chMap.get(o.channelId);
    if (o.cancelled) {
      // 취소·반품 주문: 매출/수수료/원가 0, 클레임 손실만 반영
      return {
        id: o.id,
        channelId: o.channelId,
        orderedAt: o.orderedAt,
        status: o.status,
        cancelled: true,
        revenue: 0,
        fee: 0,
        fixedFeeShare: 0,
        cost: 0,
        adCost: 0,
        claimLoss: o.claimLoss,
        profit: -o.claimLoss,
        settlementAmount: 0,
        settlementDueAt: o.orderedAt,
        missingCost: false,
        itemCount: o.items.reduce((s, it) => s + it.quantity, 0),
      };
    }
    const fee = calcFee(o, rules);
    const fixedFeeShare = fixed.get(o.id) ?? 0;
    const { cost, missing } = calcCost(o, costs);
    const adCost = adAlloc.byOrder.get(o.id) ?? 0;
    const profit = o.revenue - fee - fixedFeeShare - cost - adCost - o.claimLoss;
    return {
      id: o.id,
      channelId: o.channelId,
      orderedAt: o.orderedAt,
      status: o.status,
      cancelled: false,
      revenue: o.revenue,
      fee: fee + fixedFeeShare,
      fixedFeeShare,
      cost,
      adCost,
      claimLoss: o.claimLoss,
      profit,
      settlementAmount: o.revenue - fee,
      settlementDueAt: new Date(o.orderedAt.getTime() + (ch?.settlementDays ?? 0) * DAY),
      missingCost: missing,
      itemCount: o.items.reduce((s, it) => s + it.quantity, 0),
    };
  });
  return { orders: result, unallocatedAds: adAlloc.unallocated };
}

export function summarizeByChannel(
  profits: OrderProfit[],
  channels: ChannelInfo[],
  unallocatedAds: Map<string, number>,
  now: Date = new Date()
): ChannelSummary[] {
  const out: ChannelSummary[] = channels.map((c) => ({
    channelId: c.id,
    channelName: c.name,
    orderCount: 0,
    cancelledCount: 0,
    itemCount: 0,
    revenue: 0,
    fee: 0,
    cost: 0,
    adCost: unallocatedAds.get(c.id) ?? 0, // 배분 못한 광고비도 채널 합계에는 포함
    claimLoss: 0,
    profit: -(unallocatedAds.get(c.id) ?? 0),
    margin: 0,
    missingCostOrders: 0,
    settlementPending: 0,
  }));
  const idx = new Map(out.map((s, i) => [s.channelId, i]));
  for (const p of profits) {
    const i = idx.get(p.channelId);
    if (i == null) continue;
    const s = out[i];
    if (p.cancelled) {
      s.cancelledCount++;
      s.claimLoss += p.claimLoss;
      s.profit += p.profit;
      continue;
    }
    s.orderCount++;
    s.itemCount += p.itemCount;
    s.revenue += p.revenue;
    s.fee += p.fee;
    s.cost += p.cost;
    s.adCost += p.adCost;
    s.claimLoss += p.claimLoss;
    s.profit += p.profit;
    if (p.missingCost) s.missingCostOrders++;
    if (p.settlementDueAt.getTime() > now.getTime() && !["구매확정"].includes(p.status)) {
      s.settlementPending += p.settlementAmount;
    }
  }
  for (const s of out) s.margin = s.revenue > 0 ? s.profit / s.revenue : 0;
  return out;
}

export function sumSummaries(list: ChannelSummary[]): ChannelSummary {
  const t: ChannelSummary = {
    channelId: "total",
    channelName: "합계",
    orderCount: 0,
    cancelledCount: 0,
    itemCount: 0,
    revenue: 0,
    fee: 0,
    cost: 0,
    adCost: 0,
    claimLoss: 0,
    profit: 0,
    margin: 0,
    missingCostOrders: 0,
    settlementPending: 0,
  };
  for (const s of list) {
    t.orderCount += s.orderCount;
    t.cancelledCount += s.cancelledCount;
    t.itemCount += s.itemCount;
    t.revenue += s.revenue;
    t.fee += s.fee;
    t.cost += s.cost;
    t.adCost += s.adCost;
    t.claimLoss += s.claimLoss;
    t.profit += s.profit;
    t.missingCostOrders += s.missingCostOrders;
    t.settlementPending += s.settlementPending;
  }
  t.margin = t.revenue > 0 ? t.profit / t.revenue : 0;
  return t;
}
