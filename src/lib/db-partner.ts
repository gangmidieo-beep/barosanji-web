import crypto from "crypto";
import { eq, sql, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { getVisibleProductsForList } from "./db-products";
import {
  links as linksTable,
  orders as ordersTable,
  orderItems as orderItemsTable,
  products as productsTable,
} from "@/db/schema";

const PAID = ["결제완료", "배송준비", "배송중", "배송완료"];

export type PartnerStats = {
  monthEarnings: number;
  monthOrders: number;
  totalEarnings: number;
  clicks: number;
  pendingEarnings: number;
  conversion: number; // %
};

export async function getPartnerStats(partnerId: string): Promise<PartnerStats> {
  // 클릭 = 이 파트너 링크들의 클릭 합계
  const clk = (await db
    .select({ c: sql<number>`coalesce(sum(${linksTable.clickCount}),0)` })
    .from(linksTable)
    .where(eq(linksTable.partnerId, partnerId))) as { c: number }[];
  const clicks = Number(clk[0]?.c ?? 0);

  // 이 파트너가 소개한 주문의 order_items (수수료 계산됨)
  const rows = await db
    .select({
      commission: orderItemsTable.commissionAmount,
      status: ordersTable.status,
      createdAt: ordersTable.createdAt,
      orderId: ordersTable.id,
    })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(eq(ordersTable.referrerPartnerId, partnerId));

  const KST = 9 * 60 * 60 * 1000;
  const nowKst = new Date(Date.now() + KST);
  const monthStartUtc = Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth(), 1) - KST;

  let totalEarnings = 0,
    monthEarnings = 0;
  const paidOrderIds = new Set<string>();
  const monthOrderIds = new Set<string>();
  for (const r of rows) {
    if (!PAID.includes(r.status)) continue;
    const amt = r.commission ?? 0;
    totalEarnings += amt;
    paidOrderIds.add(r.orderId);
    if (r.createdAt.getTime() >= monthStartUtc) {
      monthEarnings += amt;
      monthOrderIds.add(r.orderId);
    }
  }

  const orders = paidOrderIds.size;
  const conversion = clicks > 0 ? Math.round((orders / clicks) * 1000) / 10 : 0;

  return {
    monthEarnings,
    monthOrders: monthOrderIds.size,
    totalEarnings,
    clicks,
    pendingEarnings: totalEarnings, // 정산 기능 붙기 전까지는 전액 정산대기로 표시
    conversion,
  };
}

/** 파트너 기본(전체) 추천 링크 보장 — 없으면 refCode로 하나 만든다 */
export async function ensureGeneralLink(partnerId: string, refCode: string): Promise<void> {
  const existing = await db
    .select({ id: linksTable.id })
    .from(linksTable)
    .where(eq(linksTable.code, refCode))
    .limit(1);
  if (existing[0]) return;
  await db.insert(linksTable).values({
    id: `lnk-${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}`,
    partnerId,
    code: refCode,
    productId: null,
    channel: "기본 링크",
  });
}

export type PartnerLink = {
  id: string;
  code: string;
  productId: string | null;
  channel: string;
  clickCount: number;
};

export async function listPartnerLinks(partnerId: string): Promise<PartnerLink[]> {
  return (await db
    .select({
      id: linksTable.id,
      code: linksTable.code,
      productId: linksTable.productId,
      channel: linksTable.channel,
      clickCount: linksTable.clickCount,
    })
    .from(linksTable)
    .where(eq(linksTable.partnerId, partnerId))) as PartnerLink[];
}

export type PartnerProduct = {
  id: string;
  name: string;
  price: number;
  reward: number;
  image: string;
  soldOut: boolean;
};

/** 링크 만들 수 있는 상품 — 앱과 동일한 인기순(구매×3+리뷰×2+클릭) 정렬 + 이미지 + 수익(수수료) */
export async function getPartnerProducts(): Promise<PartnerProduct[]> {
  const list = await getVisibleProductsForList(); // 인기순 정렬 + 품절 뒤로 + images=[url]
  const ids = list.map((p) => p.id);
  const rateRows = ids.length
    ? await db
        .select({ id: productsTable.id, rate: productsTable.commissionRate })
        .from(productsTable)
        .where(inArray(productsTable.id, ids))
    : [];
  const rateMap = new Map(rateRows.map((r) => [r.id, r.rate]));
  return list.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    reward: Math.round(p.price * (rateMap.get(p.id) ?? 0.15)),
    image: p.images?.[0] ?? `/api/product-image/${p.id}?field=images&index=0`,
    soldOut: !!p.soldOut,
  }));
}

/** 상품 링크 생성 (이미 있으면 기존 것 반환) */
export async function createProductLink(
  partnerId: string,
  productId: string
): Promise<{ code: string }> {
  const dup = await db
    .select({ code: linksTable.code })
    .from(linksTable)
    .where(sql`${linksTable.partnerId} = ${partnerId} and ${linksTable.productId} = ${productId}`)
    .limit(1);
  if (dup[0]) return { code: dup[0].code };

  let code = crypto.randomBytes(4).toString("hex");
  for (let i = 0; i < 4; i++) {
    const c = await db.select({ id: linksTable.id }).from(linksTable).where(eq(linksTable.code, code)).limit(1);
    if (!c[0]) break;
    code = crypto.randomBytes(4).toString("hex");
  }
  await db.insert(linksTable).values({
    id: `lnk-${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}`,
    partnerId,
    code,
    productId,
    channel: "",
  });
  return { code };
}
