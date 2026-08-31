import { desc, eq, sql, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { orders as ordersTable, orderItems as orderItemsTable, products as productsTable, type OrderStatus } from "@/db/schema";
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

export type AdminOrderItemRow = {
  name: string;
  unit: string; // 옵션이 있으면 옵션명이 그대로 들어있음 (예: "1kg")
  quantity: number;
  price: number;
  /** 상품 사진이 있으면 /api/product-image 경로, 없으면 null(화면에서 기본 아이콘 표시) */
  thumbnail: string | null;
};

export type AdminOrderRow = {
  orderNo: string;
  buyer: string;
  dateLabel: string;
  status: OrderStatus;
  amount: number;
  productName: string;
  supplierName: string;
  items: AdminOrderItemRow[];
  courierName: string | null;
  trackingNumber: string | null;
};

/** 관리자 주문 목록 화면용 — 상품 여러 개면 "OO 외 N건"으로 요약 */
export async function listAdminOrders(): Promise<AdminOrderRow[]> {
  const [rows, suppliers] = await Promise.all([
    db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(200),
    listSuppliers(),
  ]);
  const supplierNameById = new Map(suppliers.map((s) => [s.id, s.name || "미지정"]));

  const allItems =
    rows.length > 0
      ? await db
          .select()
          .from(orderItemsTable)
          .where(inArray(orderItemsTable.orderId, rows.map((o) => o.id)))
      : [];

  // 옵션이 있는 상품은 productId가 "p-123::1kg" 형태라, "::" 앞부분(원래 상품 ID)만 모아서
  // 사진이 있는지 한 번에 조회한다 (주문마다 따로 DB를 조회하면 느려짐).
  const baseProductIds = Array.from(
    new Set(
      allItems
        .map((i) => i.productId?.split("::")[0])
        .filter((id): id is string => !!id)
    )
  );
  const hasImageByProductId = new Map<string, boolean>();
  if (baseProductIds.length > 0) {
    const imageRows = await db
      .select({
        id: productsTable.id,
        hasImage: sql<boolean>`jsonb_array_length(${productsTable.images}) > 0`,
      })
      .from(productsTable)
      .where(inArray(productsTable.id, baseProductIds));
    for (const r of imageRows) hasImageByProductId.set(r.id, r.hasImage);
  }

  const itemsByOrderId = new Map<string, typeof allItems>();
  for (const it of allItems) {
    const list = itemsByOrderId.get(it.orderId) ?? [];
    list.push(it);
    itemsByOrderId.set(it.orderId, list);
  }

  const result: AdminOrderRow[] = [];
  for (const o of rows) {
    const items = itemsByOrderId.get(o.id) ?? [];
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
      courierName: o.courierName,
      trackingNumber: o.trackingNumber,
      items: items.map((i) => {
        const baseId = i.productId?.split("::")[0];
        const hasImage = baseId ? hasImageByProductId.get(baseId) : false;
        return {
          name: i.name,
          unit: i.unit,
          quantity: i.quantity,
          price: i.price,
          thumbnail: hasImage && baseId ? `/api/product-image/${baseId}?field=images&index=0` : null,
        };
      }),
    });
  }
  return result;
}

/** 송장번호/택배사 입력 — 어드민플러스 API 연동 전까지는 관리자가 직접 입력 */
export async function updateOrderTracking(
  orderId: string,
  courierName: string,
  trackingNumber: string
): Promise<void> {
  await db
    .update(ordersTable)
    .set({ courierName: courierName || null, trackingNumber: trackingNumber || null, updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId));
}
