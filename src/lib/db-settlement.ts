import crypto from "crypto";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db/client";
import {
  settlements as settlementsTable,
  orders as ordersTable,
  orderItems as orderItemsTable,
  partners as partnersTable,
} from "@/db/schema";

const PAID = ["결제완료", "배송준비", "배송중", "배송완료"];

async function earnedTotal(partnerId: string): Promise<number> {
  const rows = await db
    .select({ c: orderItemsTable.commissionAmount, status: ordersTable.status })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(eq(ordersTable.referrerPartnerId, partnerId));
  let sum = 0;
  for (const r of rows) if (PAID.includes(r.status)) sum += r.c ?? 0;
  return sum;
}

export type SettlementSummary = { earned: number; settledOrPending: number; available: number };

export async function getSettlementSummary(partnerId: string): Promise<SettlementSummary> {
  const earned = await earnedTotal(partnerId);
  const rows = await db
    .select({ amount: settlementsTable.amount, status: settlementsTable.status })
    .from(settlementsTable)
    .where(eq(settlementsTable.partnerId, partnerId));
  let settledOrPending = 0;
  for (const r of rows) if (r.status !== "rejected") settledOrPending += r.amount;
  return { earned, settledOrPending, available: Math.max(0, earned - settledOrPending) };
}

export type SettlementRow = {
  id: string; amount: number; status: string;
  requestedAt: Date; paidAt: Date | null;
};

export async function listSettlements(partnerId: string): Promise<SettlementRow[]> {
  return (await db
    .select({
      id: settlementsTable.id, amount: settlementsTable.amount, status: settlementsTable.status,
      requestedAt: settlementsTable.requestedAt, paidAt: settlementsTable.paidAt,
    })
    .from(settlementsTable)
    .where(eq(settlementsTable.partnerId, partnerId))
    .orderBy(desc(settlementsTable.requestedAt))) as SettlementRow[];
}

export async function requestSettlement(partnerId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = (await db
    .select({ bankName: partnersTable.bankName, bankAccount: partnersTable.bankAccount, bankHolder: partnersTable.bankHolder })
    .from(partnersTable).where(eq(partnersTable.id, partnerId)).limit(1))[0];
  if (!p || !p.bankAccount || !p.bankHolder) {
    return { ok: false, error: "먼저 정산받을 계좌를 등록해주세요. (내정보 탭)" };
  }
  const sum = await getSettlementSummary(partnerId);
  if (sum.available <= 0) return { ok: false, error: "정산 신청할 금액이 없어요." };
  await db.insert(settlementsTable).values({
    id: `stl-${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}`,
    partnerId, amount: sum.available, status: "requested",
    bankName: p.bankName, bankAccount: p.bankAccount, bankHolder: p.bankHolder,
  });
  return { ok: true };
}

export async function updatePartnerBank(
  partnerId: string,
  bank: { bankName: string; bankAccount: string; bankHolder: string }
): Promise<void> {
  await db.update(partnersTable).set(bank).where(eq(partnersTable.id, partnerId));
}

/** 통계 페이지용: 이 파트너가 소개한 최근 주문 */
export type PartnerOrderRow = { id: string; dateLabel: string; amount: number; commission: number; paid: boolean; status: string };
export async function getPartnerRecentOrders(partnerId: string, limit = 30): Promise<PartnerOrderRow[]> {
  const rows = await db
    .select({
      id: ordersTable.id, amount: ordersTable.amount, status: ordersTable.status,
      createdAt: ordersTable.createdAt, commission: orderItemsTable.commissionAmount,
    })
    .from(ordersTable)
    .leftJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(eq(ordersTable.referrerPartnerId, partnerId))
    .orderBy(desc(ordersTable.createdAt));
  // 주문별로 수수료 합산 (order_items 여러 줄)
  const byOrder = new Map<string, PartnerOrderRow>();
  for (const r of rows) {
    const kst = new Date(r.createdAt.getTime() + 9 * 60 * 60 * 1000);
    const dateLabel = `${kst.getUTCMonth() + 1}/${kst.getUTCDate()}`;
    const cur = byOrder.get(r.id) ?? {
      id: r.id, dateLabel, amount: r.amount, commission: 0,
      paid: PAID.includes(r.status), status: r.status,
    };
    cur.commission += r.commission ?? 0;
    byOrder.set(r.id, cur);
  }
  return Array.from(byOrder.values()).slice(0, limit);
}
