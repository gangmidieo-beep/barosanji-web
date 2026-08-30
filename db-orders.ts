import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders as ordersTable, orderItems as orderItemsTable, type OrderStatus } from "@/db/schema";
import { listSuppliers } from "@/lib/db-suppliers";

export type NewOrderItem = {
  productId?: string;
  name: string;
  unit?: string;
  quantity: number;
  price: number;
  supplierId: string;
};

export type NewOrder = {
  id: string; // ORD-<timestamp>
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverAddressDetail?: string;
  deliveryMemo?: string;
  amount: number;
  items: NewOrderItem[];
};

/** 결제 요청 시점에 주문을 "결제대기" 상태로 미리 저장해둔다 (예전 in-memory pending-orders 대체) */
export async function createPendingOrder(order: NewOrder): Promise<void> {
  await db.insert(ordersTable).values({
    id: order.id,
    receiverName: order.receiverName,
    receiverPhone: order.receiverPhone,
    receiverAddress: order.receiverAddress,
    receiverAddressDetail: order.receiverAddressDetail,
    deliveryMemo: order.deliveryMemo,
    amount: order.amount,
    status: "결제대기",
  });
  if (order.items.length > 0) {
    await db.insert(orderItemsTable).values(
      order.items.map((it, i) => ({
        id: `${order.id}-item-${i}`,
        orderId: order.id,
        productId: it.productId ?? null,
        name: it.name,
        unit: it.unit ?? "",
        quantity: it.quantity,
        price: it.price,
        supplierId: it.supplierId,
      }))
    );
  }
}

export type OrderWithItems = {
  id: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverAddressDetail: string | null;
  deliveryMemo: string | null;
  amount: number;
  status: OrderStatus;
  createdAt: Date;
  items: { name: string; unit: string; quantity: number; price: number; supplierId: string }[];
};

export async function getOrderWithItems(orderId: string): Promise<OrderWithItems | undefined> {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) return undefined;
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  return {
    id: order.id,
    receiverName: order.receiverName,
    receiverPhone: order.receiverPhone,
    receiverAddress: order.receiverAddress,
    receiverAddressDetail: order.receiverAddressDetail,
    deliveryMemo: order.deliveryMemo,
    amount: order.amount,
    status: order.status,
    createdAt: order.createdAt,
    items: items.map((i) => ({
      name: i.name,
      unit: i.unit,
      quantity: i.quantity,
      price: i.price,
      supplierId: i.supplierId,
    })),
  };
}

/** 결제완료/실패 등 웹훅에서 상태를 갱신 */
export async function updateOrderPayResult(
  orderId: string,
  status: OrderStatus,
  payState?: string
): Promise<void> {
  await db
    .update(ordersTable)
    .set({ status, payState: payState ?? null, updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId));
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  await db.update(ordersTable).set({ status, updatedAt: new Date() }).where(eq(ordersTable.id, orderId));
}

export type AdminOrderRow = {
  orderNo: string;
  buyer: string;
  dateLabel: string;
  status: OrderStatus;
  amount: number;
  productName: string;
  supplierName: string;
};

/** 관리자 주문 목록 화면용 — 상품 여러 개면 "OO 외 N건"으로 요약 */
export async function listAdminOrders(): Promise<AdminOrderRow[]> {
  const [rows, suppliers] = await Promise.all([
    db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(200),
    listSuppliers(),
  ]);
  const supplierNameById = new Map(suppliers.map((s) => [s.id, s.name || "미지정"]));
  const result: AdminOrderRow[] = [];
  for (const o of rows) {
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
    const productName =
      items.length === 0
        ? "-"
        : items.length === 1
        ? items[0].name
        : `${items[0].name} 외 ${items.length - 1}건`;
    const supplierNames = Array.from(
      new Set(items.map((i) => supplierNameById.get(i.supplierId) ?? i.supplierId))
    );
    result.push({
      orderNo: o.id,
      buyer: o.receiverName,
      dateLabel: o.createdAt.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: o.status,
      amount: o.amount,
      productName,
      supplierName: supplierNames.join(", ") || "-",
    });
  }
  return result;
}
