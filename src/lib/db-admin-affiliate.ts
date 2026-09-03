import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  partners as partnersTable,
  orders as ordersTable,
  orderItems as orderItemsTable,
  settlements as settlementsTable,
} from "@/db/schema";

const PAID = ["결제완료", "배송준비", "배송중", "배송완료"];

export type AdminPartnerRow = {
  id: string; email: string; name: string; refCode: string;
  earned: number; orders: number;
  bankName: string; bankAccount: string; bankHolder: string;
};

export async function listPartnersForAdmin(): Promise<AdminPartnerRow[]> {
  const partners = await db.select().from(partnersTable).orderBy(desc(partnersTable.createdAt));
  // 파트너별 확정수익/주문수
  const rows = await db
    .select({
      partnerId: ordersTable.referrerPartnerId,
      status: ordersTable.status,
      orderId: ordersTable.id,
      commission: orderItemsTable.commissionAmount,
    })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id));

  const earnedBy = new Map<string, number>();
  const ordersBy = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.partnerId || !PAID.includes(r.status)) continue;
    earnedBy.set(r.partnerId, (earnedBy.get(r.partnerId) ?? 0) + (r.commission ?? 0));
    if (!ordersBy.has(r.partnerId)) ordersBy.set(r.partnerId, new Set());
    ordersBy.get(r.partnerId)!.add(r.orderId);
  }

  return partners.map((p) => ({
    id: p.id, email: p.email, name: p.name, refCode: p.refCode,
    earned: earnedBy.get(p.id) ?? 0,
    orders: ordersBy.get(p.id)?.size ?? 0,
    bankName: p.bankName, bankAccount: p.bankAccount, bankHolder: p.bankHolder,
  }));
}

export type AdminSettlementRow = {
  id: string; partnerId: string; partnerName: string; partnerEmail: string;
  amount: number; status: string;
  bankName: string; bankAccount: string; bankHolder: string;
  requestedAt: Date; paidAt: Date | null;
};

export async function listSettlementsForAdmin(): Promise<AdminSettlementRow[]> {
  const rows = await db
    .select({
      id: settlementsTable.id, partnerId: settlementsTable.partnerId,
      amount: settlementsTable.amount, status: settlementsTable.status,
      bankName: settlementsTable.bankName, bankAccount: settlementsTable.bankAccount, bankHolder: settlementsTable.bankHolder,
      requestedAt: settlementsTable.requestedAt, paidAt: settlementsTable.paidAt,
      partnerName: partnersTable.name, partnerEmail: partnersTable.email,
    })
    .from(settlementsTable)
    .leftJoin(partnersTable, eq(settlementsTable.partnerId, partnersTable.id))
    .orderBy(desc(settlementsTable.requestedAt));
  return rows.map((r) => ({
    id: r.id, partnerId: r.partnerId, partnerName: r.partnerName ?? "", partnerEmail: r.partnerEmail ?? "",
    amount: r.amount, status: r.status,
    bankName: r.bankName, bankAccount: r.bankAccount, bankHolder: r.bankHolder,
    requestedAt: r.requestedAt, paidAt: r.paidAt,
  }));
}

export async function updateSettlementStatus(id: string, status: "paid" | "rejected"): Promise<void> {
  await db
    .update(settlementsTable)
    .set({ status, paidAt: status === "paid" ? new Date() : null })
    .where(eq(settlementsTable.id, id));
}
