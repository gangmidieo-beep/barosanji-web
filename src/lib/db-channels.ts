import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  channels,
  channelFeeRules,
  productCosts,
  adSpends,
  channelOrders,
  channelOrderItems,
  orders as shopOrders,
  orderItems as shopOrderItems,
  products,
  type ChannelOrderStatus,
} from "@/db/schema";
import {
  computeOrderProfits,
  summarizeByChannel,
  sumSummaries,
  dayKey,
  type OrderInput,
  type OrderProfit,
  type ChannelSummary,
  type ChannelInfo,
} from "./channel-profit";

// ---------- 채널 ----------
export type Channel = typeof channels.$inferSelect;

export async function listChannels(): Promise<Channel[]> {
  return db.select().from(channels).orderBy(asc(channels.sortOrder));
}

export async function updateChannel(
  id: string,
  patch: Partial<Pick<Channel, "name" | "enabled" | "monthlyFee" | "monthlyFeeThreshold" | "settlementNote" | "settlementDays" | "apiStatus">>
) {
  await db.update(channels).set(patch).where(eq(channels.id, id));
}

// ---------- 수수료 규칙 ----------
export type FeeRuleRow = typeof channelFeeRules.$inferSelect;

export async function listFeeRules(): Promise<FeeRuleRow[]> {
  return db.select().from(channelFeeRules).orderBy(asc(channelFeeRules.channelId), asc(channelFeeRules.category), desc(channelFeeRules.effectiveFrom));
}

export async function addFeeRule(input: {
  channelId: string;
  category: string;
  saleRate: number;
  paymentRate: number;
  vatOnFee: boolean;
  effectiveFrom: Date;
  note?: string;
}) {
  const [row] = await db.insert(channelFeeRules).values({ ...input, note: input.note ?? "" }).returning();
  return row;
}

export async function deleteFeeRule(id: number) {
  await db.delete(channelFeeRules).where(eq(channelFeeRules.id, id));
}

// ---------- 원가 ----------
export type CostRow = typeof productCosts.$inferSelect;

export async function listCosts(): Promise<CostRow[]> {
  return db.select().from(productCosts).orderBy(asc(productCosts.productId), desc(productCosts.effectiveFrom), desc(productCosts.id));
}

/** 상품별 현재 유효 원가 (최신 1건) */
export async function listCurrentCosts(): Promise<Map<string, CostRow>> {
  const rows = await listCosts();
  const now = Date.now();
  const map = new Map<string, CostRow>();
  for (const r of rows) {
    if (r.effectiveFrom.getTime() > now) continue;
    if (!map.has(r.productId)) map.set(r.productId, r); // 정렬이 최신순이라 첫 번째가 현재값
  }
  return map;
}

export async function addCost(input: {
  productId: string;
  costPrice: number;
  shippingCost: number;
  packagingCost: number;
  effectiveFrom: Date;
  note?: string;
}) {
  const [row] = await db.insert(productCosts).values({ ...input, note: input.note ?? "" }).returning();
  return row;
}

export async function deleteCost(id: number) {
  await db.delete(productCosts).where(eq(productCosts.id, id));
}

// ---------- 광고비 ----------
export type AdRow = typeof adSpends.$inferSelect;

export async function listAds(from?: Date, to?: Date): Promise<AdRow[]> {
  const conds = [];
  if (from) conds.push(gte(adSpends.spentOn, from));
  if (to) conds.push(lte(adSpends.spentOn, to));
  return db
    .select()
    .from(adSpends)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(adSpends.spentOn), desc(adSpends.id));
}

export async function addAd(input: { channelId: string; spentOn: Date; amount: number; productId?: string | null; memo?: string }) {
  const [row] = await db
    .insert(adSpends)
    .values({ channelId: input.channelId, spentOn: input.spentOn, amount: input.amount, productId: input.productId ?? null, memo: input.memo ?? "" })
    .returning();
  return row;
}

export async function deleteAd(id: number) {
  await db.delete(adSpends).where(eq(adSpends.id, id));
}

// ---------- 채널 주문 ----------
export type ChannelOrderRow = typeof channelOrders.$inferSelect;
export type ChannelOrderItemRow = typeof channelOrderItems.$inferSelect;
export type ChannelOrderWithItems = ChannelOrderRow & { items: ChannelOrderItemRow[] };

export type NewChannelOrder = {
  channelId: string;
  externalOrderId: string;
  orderedAt: Date;
  status?: ChannelOrderStatus;
  buyerName?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  deliveryMemo?: string;
  shippingFee?: number;
  claimLoss?: number;
  courierName?: string | null;
  trackingNumber?: string | null;
  source?: string;
  raw?: unknown;
  items: {
    productId?: string | null;
    name: string;
    option?: string;
    category?: string;
    quantity: number;
    unitPrice: number;
    supplierId?: string | null;
  }[];
};

/** 채널 주문 저장 (같은 채널·주문번호가 있으면 덮어씀 → API 폴링 시 중복 방지) */
export async function upsertChannelOrder(input: NewChannelOrder): Promise<string> {
  const id = `${input.channelId}:${input.externalOrderId}`;
  // 상품 매핑이 있으면 카테고리·공급업체를 상품 마스터에서 보충
  const baseIds = Array.from(new Set(input.items.map((it) => it.productId?.split("::")[0]).filter((x): x is string => !!x)));
  const prodMap = new Map<string, { category: string; supplierId: string }>();
  if (baseIds.length) {
    const rows = await db.select({ id: products.id, category: products.category, supplierId: products.supplierId }).from(products).where(inArray(products.id, baseIds));
    for (const r of rows) prodMap.set(r.id, { category: r.category, supplierId: r.supplierId });
  }
  await db.transaction(async (tx) => {
    await tx
      .insert(channelOrders)
      .values({
        id,
        channelId: input.channelId,
        externalOrderId: input.externalOrderId,
        orderedAt: input.orderedAt,
        status: input.status ?? "신규",
        buyerName: input.buyerName ?? "",
        receiverName: input.receiverName ?? "",
        receiverPhone: input.receiverPhone ?? "",
        receiverAddress: input.receiverAddress ?? "",
        deliveryMemo: input.deliveryMemo ?? "",
        shippingFee: input.shippingFee ?? 0,
        claimLoss: input.claimLoss ?? 0,
        courierName: input.courierName ?? null,
        trackingNumber: input.trackingNumber ?? null,
        source: input.source ?? "manual",
        raw: input.raw ?? null,
      })
      .onConflictDoUpdate({
        target: channelOrders.id,
        set: {
          orderedAt: input.orderedAt,
          status: input.status ?? "신규",
          buyerName: input.buyerName ?? "",
          receiverName: input.receiverName ?? "",
          receiverPhone: input.receiverPhone ?? "",
          receiverAddress: input.receiverAddress ?? "",
          deliveryMemo: input.deliveryMemo ?? "",
          shippingFee: input.shippingFee ?? 0,
          claimLoss: input.claimLoss ?? 0,
          courierName: input.courierName ?? null,
          trackingNumber: input.trackingNumber ?? null,
          source: input.source ?? "manual",
          raw: input.raw ?? null,
          updatedAt: new Date(),
        },
      });
    await tx.delete(channelOrderItems).where(eq(channelOrderItems.channelOrderId, id));
    if (input.items.length) {
      await tx.insert(channelOrderItems).values(
        input.items.map((it, i) => {
          const base = it.productId?.split("::")[0];
          const p = base ? prodMap.get(base) : undefined;
          return {
            id: `${id}-item-${i}`,
            channelOrderId: id,
            productId: it.productId ?? null,
            name: it.name,
            option: it.option ?? "",
            category: it.category || p?.category || "",
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            supplierId: it.supplierId ?? p?.supplierId ?? null,
          };
        })
      );
    }
  });
  return id;
}

export async function updateChannelOrder(
  id: string,
  patch: Partial<Pick<ChannelOrderRow, "status" | "courierName" | "trackingNumber" | "claimLoss" | "supplierOrderNote" | "deliveryMemo">>
) {
  await db.update(channelOrders).set({ ...patch, updatedAt: new Date() }).where(eq(channelOrders.id, id));
}

export async function deleteChannelOrder(id: string) {
  await db.delete(channelOrders).where(eq(channelOrders.id, id));
}

export async function listChannelOrders(opts: { from?: Date; to?: Date; channelId?: string; status?: string; limit?: number } = {}): Promise<ChannelOrderWithItems[]> {
  const conds = [];
  if (opts.from) conds.push(gte(channelOrders.orderedAt, opts.from));
  if (opts.to) conds.push(lte(channelOrders.orderedAt, opts.to));
  if (opts.channelId) conds.push(eq(channelOrders.channelId, opts.channelId));
  if (opts.status) conds.push(eq(channelOrders.status, opts.status as ChannelOrderStatus));
  const heads = await db
    .select()
    .from(channelOrders)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(channelOrders.orderedAt))
    .limit(opts.limit ?? 2000);
  if (!heads.length) return [];
  const items = await db.select().from(channelOrderItems).where(inArray(channelOrderItems.channelOrderId, heads.map((h) => h.id)));
  const byOrder = new Map<string, ChannelOrderItemRow[]>();
  for (const it of items) {
    if (!byOrder.has(it.channelOrderId)) byOrder.set(it.channelOrderId, []);
    byOrder.get(it.channelOrderId)!.push(it);
  }
  return heads.map((h) => ({ ...h, items: byOrder.get(h.id) ?? [] }));
}

// ---------- 자사몰 주문을 채널 주문 형식으로 ----------
async function loadShopOrdersAsInputs(from: Date, to: Date): Promise<OrderInput[]> {
  const heads = await db
    .select({ id: shopOrders.id, status: shopOrders.status, createdAt: shopOrders.createdAt })
    .from(shopOrders)
    .where(and(gte(shopOrders.createdAt, from), lte(shopOrders.createdAt, to)));
  if (!heads.length) return [];
  const items = await db
    .select({
      orderId: shopOrderItems.orderId,
      productId: shopOrderItems.productId,
      quantity: shopOrderItems.quantity,
      price: shopOrderItems.price,
      category: products.category,
    })
    .from(shopOrderItems)
    .leftJoin(products, eq(products.id, sql`split_part(${shopOrderItems.productId}, '::', 1)`))
    .where(inArray(shopOrderItems.orderId, heads.map((h) => h.id)));
  const byOrder = new Map<string, OrderInput["items"]>();
  for (const it of items) {
    if (!byOrder.has(it.orderId)) byOrder.set(it.orderId, []);
    byOrder.get(it.orderId)!.push({ productId: it.productId, category: it.category ?? "", quantity: it.quantity, unitPrice: it.price });
  }
  return heads.map((h) => ({
    id: `barosanji:${h.id}`,
    channelId: "barosanji",
    orderedAt: h.createdAt,
    status: h.status,
    shippingFee: 0,
    claimLoss: 0,
    items: byOrder.get(h.id) ?? [],
  }));
}

// ---------- 수익 리포트 ----------
export type ProductProfitRow = {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
  fee: number;
  cost: number;
  adCost: number;
  profit: number;
  margin: number;
  missingCost: boolean;
};

export type DailyPoint = { day: string; revenue: number; profit: number; orders: number };

export type ProfitReport = {
  from: Date;
  to: Date;
  channels: ChannelSummary[];
  total: ChannelSummary;
  products: ProductProfitRow[];
  daily: DailyPoint[];
  orders: OrderProfit[];
  settlementCalendar: { day: string; channelId: string; channelName: string; amount: number }[];
  unallocatedAds: Record<string, number>;
};

export async function getProfitReport(from: Date, to: Date): Promise<ProfitReport> {
  const [chRows, ruleRows, costRows, adRows, extOrders, shopInputs] = await Promise.all([
    listChannels(),
    listFeeRules(),
    listCosts(),
    listAds(from, to),
    listChannelOrders({ from, to, limit: 10000 }),
    loadShopOrdersAsInputs(from, to),
  ]);

  const channelInfos: ChannelInfo[] = chRows.map((c) => ({
    id: c.id,
    name: c.name,
    monthlyFee: c.monthlyFee,
    monthlyFeeThreshold: c.monthlyFeeThreshold,
    settlementDays: c.settlementDays,
  }));

  const extInputs: OrderInput[] = extOrders.map((o) => ({
    id: o.id,
    channelId: o.channelId,
    orderedAt: o.orderedAt,
    status: o.status,
    shippingFee: o.shippingFee,
    claimLoss: o.claimLoss,
    items: o.items.map((it) => ({ productId: it.productId, name: it.name, category: it.category, quantity: it.quantity, unitPrice: it.unitPrice })),
  }));
  const inputs = [...shopInputs, ...extInputs];

  const { orders: profits, unallocatedAds } = computeOrderProfits(
    inputs,
    ruleRows.map((r) => ({ channelId: r.channelId, category: r.category, saleRate: r.saleRate, paymentRate: r.paymentRate, vatOnFee: r.vatOnFee, effectiveFrom: r.effectiveFrom })),
    costRows.map((c) => ({ productId: c.productId, costPrice: c.costPrice, shippingCost: c.shippingCost, packagingCost: c.packagingCost, effectiveFrom: c.effectiveFrom })),
    adRows.map((a) => ({ channelId: a.channelId, spentOn: a.spentOn, amount: a.amount, productId: a.productId })),
    channelInfos
  );

  const summaries = summarizeByChannel(profits, channelInfos, unallocatedAds);
  const total = sumSummaries(summaries);

  // 상품별: 주문 단위 수수료·광고비·택배비를 품목 매출 비율로 배분
  const inputById = new Map(inputs.map((o) => [o.id, o]));
  const prodAgg = new Map<string, ProductProfitRow>();
  const costByProduct = costRows
    .slice()
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime() || b.id - a.id);
  const nameById = new Map<string, string>();
  for (const o of extOrders) for (const it of o.items) if (it.productId) nameById.set(it.productId.split("::")[0], it.name);
  const shopNames = await db.select({ id: products.id, name: products.name }).from(products);
  for (const p of shopNames) nameById.set(p.id, p.name);

  for (const p of profits) {
    if (p.cancelled) continue;
    const o = inputById.get(p.id);
    if (!o) continue;
    const orderLineRevenue = o.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    for (const it of o.items) {
      const key = (it.productId ?? "").split("::")[0] || `(미매핑) ${it.name ?? ""}`.trim();
      const lineRev = it.unitPrice * it.quantity;
      const share = orderLineRevenue > 0 ? lineRev / orderLineRevenue : 1 / o.items.length;
      const costRule = it.productId ? costByProduct.find((c) => (c.productId === it.productId || c.productId === it.productId!.split("::")[0]) && c.effectiveFrom.getTime() <= o.orderedAt.getTime()) : undefined;
      const lineCost = costRule ? (costRule.costPrice + costRule.packagingCost) * it.quantity : 0;
      const row =
        prodAgg.get(key) ??
        ({
          productId: key,
          name: nameById.get(key) ?? key,
          quantity: 0,
          revenue: 0,
          fee: 0,
          cost: 0,
          adCost: 0,
          profit: 0,
          margin: 0,
          missingCost: false,
        } as ProductProfitRow);
      row.quantity += it.quantity;
      row.revenue += lineRev;
      row.fee += Math.round(p.fee * share);
      row.adCost += Math.round(p.adCost * share);
      // 택배비·클레임은 주문 단위라 매출 비율로 배분
      const orderLevelCost = p.cost - o.items.reduce((s, x) => {
        const cr = x.productId ? costByProduct.find((c) => (c.productId === x.productId || c.productId === x.productId!.split("::")[0]) && c.effectiveFrom.getTime() <= o.orderedAt.getTime()) : undefined;
        return s + (cr ? (cr.costPrice + cr.packagingCost) * x.quantity : 0);
      }, 0);
      row.cost += lineCost + Math.round(orderLevelCost * share);
      row.profit = row.revenue - row.fee - row.cost - row.adCost;
      if (!costRule) row.missingCost = true;
      prodAgg.set(key, row);
    }
  }
  const productRows = Array.from(prodAgg.values()).map((r) => ({ ...r, margin: r.revenue > 0 ? r.profit / r.revenue : 0 }));
  productRows.sort((a, b) => b.profit - a.profit);

  // 일별 추이
  const dailyMap = new Map<string, DailyPoint>();
  for (const p of profits) {
    if (p.cancelled) continue;
    const k = dayKey(p.orderedAt);
    const d = dailyMap.get(k) ?? { day: k, revenue: 0, profit: 0, orders: 0 };
    d.revenue += p.revenue;
    d.profit += p.profit;
    d.orders++;
    dailyMap.set(k, d);
  }
  const daily = Array.from(dailyMap.values()).sort((a, b) => a.day.localeCompare(b.day));

  // 정산 캘린더 (입금 예정일 기준, 아직 안 들어온 것)
  const now = Date.now();
  const calMap = new Map<string, { day: string; channelId: string; channelName: string; amount: number }>();
  const chName = new Map(channelInfos.map((c) => [c.id, c.name]));
  for (const p of profits) {
    if (p.cancelled || p.settlementDueAt.getTime() <= now) continue;
    const day = dayKey(p.settlementDueAt);
    const k = `${day}|${p.channelId}`;
    const c = calMap.get(k) ?? { day, channelId: p.channelId, channelName: chName.get(p.channelId) ?? p.channelId, amount: 0 };
    c.amount += p.settlementAmount;
    calMap.set(k, c);
  }
  const settlementCalendar = Array.from(calMap.values()).sort((a, b) => a.day.localeCompare(b.day));

  return {
    from,
    to,
    channels: summaries,
    total,
    products: productRows,
    daily,
    orders: profits.sort((a, b) => b.orderedAt.getTime() - a.orderedAt.getTime()),
    settlementCalendar,
    unallocatedAds: Object.fromEntries(unallocatedAds),
  };
}
