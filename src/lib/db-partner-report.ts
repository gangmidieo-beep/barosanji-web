import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  orders as ordersTable,
  orderItems as orderItemsTable,
  links as linksTable,
} from "@/db/schema";

const PAID = ["결제완료", "배송준비", "배송중", "배송완료"];
const REFUNDED = ["결제취소"];

export type ReportItem = {
  createdAt: string; // ISO
  productId: string | null;
  name: string;
  qty: number;
  amount: number; // 실결제(상품 합)
  commission: number;
  refunded: boolean;
  paid: boolean;
};

export type ReportData = {
  totalClicks: number;
  items: ReportItem[];
};

export async function getPartnerReportRaw(partnerId: string): Promise<ReportData> {
  const clk = (await db
    .select({ c: sql<number>`coalesce(sum(${linksTable.clickCount}),0)` })
    .from(linksTable)
    .where(eq(linksTable.partnerId, partnerId))) as { c: number }[];
  const totalClicks = Number(clk[0]?.c ?? 0);

  const rows = await db
    .select({
      createdAt: ordersTable.createdAt,
      status: ordersTable.status,
      productId: orderItemsTable.productId,
      name: orderItemsTable.name,
      qty: orderItemsTable.quantity,
      price: orderItemsTable.price,
      commission: orderItemsTable.commissionAmount,
    })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(eq(ordersTable.referrerPartnerId, partnerId));

  const items: ReportItem[] = rows.map((r) => ({
    createdAt: r.createdAt.toISOString(),
    productId: r.productId,
    name: r.name,
    qty: r.qty,
    amount: r.price * r.qty,
    commission: r.commission ?? 0,
    refunded: REFUNDED.includes(r.status),
    paid: PAID.includes(r.status),
  }));

  return { totalClicks, items };
}
