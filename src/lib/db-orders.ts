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
  items: { name: string; unit: string; quantity: number; price: number; supplierId: string; productId: string | null }[];
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
/** 관리자 메인 대시보드 숫자 — 실제 주문 DB에서 집계한 값 */
export type DashboardStats = {
  monthSales: number;
  monthOrders: number;
  totalSales: number;
  totalOrders: number;
  todaySales: number;
  todayOrders: number;
  last7Sales: number;
  last7Orders: number;
  pendingCount: number;
  toShipCount: number;
  dailySeries: { key: string; value: number }[];
};

// 매출로 잡는 상태(결제 완료 이후 단계). 결제대기/결제취소는 매출에서 제외한다.
const PAID_STATUSES: OrderStatus[] = ["결제완료", "배송준비", "배송중", "배송완료"];

export async function getDashboardStats(): Promise<DashboardStats> {
  const rows = await db
    .select({
      amount: ordersTable.amount,
      status: ordersTable.status,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable);

  const KST = 9 * 60 * 60 * 1000; // 서버는 UTC라 한국시간 기준으로 하루/한달을 계산한다
  const now = Date.now();
  const nowKst = new Date(now + KST);
  const startOfTodayUtc =
    Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth(), nowKst.getUTCDate()) - KST;
  const startOfMonthUtc =
    Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth(), 1) - KST;
  const start7Utc = startOfTodayUtc - 6 * 24 * 60 * 60 * 1000; // 오늘 포함 최근 7일

  // 최근 14일 매출 버킷 (한국시간 기준 날짜 라벨: "9/1" 형태)
  const dayKeys: string[] = [];
  const dayBucket = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now + KST - i * 24 * 60 * 60 * 1000);
    const key = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
    dayKeys.push(key);
    dayBucket.set(key, 0);
  }

  let monthSales = 0,
    monthOrders = 0,
    totalSales = 0,
    totalOrders = 0,
    todaySales = 0,
    todayOrders = 0,
    last7Sales = 0,
    last7Orders = 0,
    pendingCount = 0,
    toShipCount = 0;

  for (const r of rows) {
    if (r.status === "결제대기") pendingCount++;
    if (r.status === "결제완료" || r.status === "배송준비") toShipCount++;
    if (!PAID_STATUSES.includes(r.status)) continue;

    const t = r.createdAt.getTime();
    totalSales += r.amount;
    totalOrders++;
    if (t >= startOfMonthUtc) {
      monthSales += r.amount;
      monthOrders++;
    }
    if (t >= startOfTodayUtc) {
      todaySales += r.amount;
      todayOrders++;
    }
    if (t >= start7Utc) {
      last7Sales += r.amount;
      last7Orders++;
    }

    const dk = new Date(t + KST);
    const key = `${dk.getUTCMonth() + 1}/${dk.getUTCDate()}`;
    if (dayBucket.has(key)) dayBucket.set(key, (dayBucket.get(key) ?? 0) + r.amount);
  }

  return {
    monthSales,
    monthOrders,
    totalSales,
    totalOrders,
    todaySales,
    todayOrders,
    last7Sales,
    last7Orders,
    pendingCount,
    toShipCount,
    dailySeries: dayKeys.map((k) => ({ key: k, value: dayBucket.get(k) ?? 0 })),
  };
}
