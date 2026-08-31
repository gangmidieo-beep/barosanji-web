import { asc, eq, ne, sql, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { products as productsTable, orders as ordersTable, orderItems as orderItemsTable } from "@/db/schema";
import type { Product } from "@/lib/data";

function toProduct(row: typeof productsTable.$inferSelect): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    extraCategories: row.extraCategories && row.extraCategories.length > 0 ? row.extraCategories : undefined,
    farm: row.farm,
    region: row.region,
    price: row.price,
    originalPrice: row.originalPrice,
    unit: row.unit,
    badge: (row.badge as Product["badge"]) ?? undefined,
    soldOut: row.soldOut,
    rating: row.rating,
    reviewCount: row.reviewCount,
    image: row.image,
    images: row.images && row.images.length > 0 ? row.images : undefined,
    detailImages: row.detailImages && row.detailImages.length > 0 ? row.detailImages : undefined,
    description: row.description,
    supplierId: row.supplierId,
    supplierProductCode: row.supplierProductCode ?? undefined,
    maxQty: row.maxQty ?? undefined,
    options: row.options ?? undefined,
  };
}

export async function getVisibleProducts(): Promise<Product[]> {
  const rows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.visible, true))
    .orderBy(asc(productsTable.createdAt));
  return rows.map(toProduct);
}

export async function getVisibleProductsForList(): Promise<Product[]> {
  const [rows, purchaseRows] = await Promise.all([
    db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        category: productsTable.category,
        extraCategories: productsTable.extraCategories,
        farm: productsTable.farm,
        region: productsTable.region,
        price: productsTable.price,
        originalPrice: productsTable.originalPrice,
        unit: productsTable.unit,
        badge: productsTable.badge,
        soldOut: productsTable.soldOut,
        rating: productsTable.rating,
        reviewCount: productsTable.reviewCount,
        clickCount: productsTable.clickCount,
        image: productsTable.image,
        hasImage: sql<boolean>`jsonb_array_length(${productsTable.images}) > 0`,
        supplierId: productsTable.supplierId,
        maxQty: productsTable.maxQty,
        options: productsTable.options,
      })
      .from(productsTable)
      .where(eq(productsTable.visible, true)),
    db
      .select({
        baseProductId: sql<string>`split_part(${orderItemsTable.productId}, '::', 1)`,
        totalQty: sql<number>`sum(${orderItemsTable.quantity})`,
      })
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
      .where(ne(ordersTable.status, "결제대기"))
      .groupBy(sql`split_part(${orderItemsTable.productId}, '::', 1)`),
  ]);

  const purchaseByProductId = new Map<string, number>();
  for (const r of purchaseRows) {
    if (r.baseProductId) purchaseByProductId.set(r.baseProductId, Number(r.totalQty) || 0);
  }

  const withScore = rows.map((row) => {
    const purchaseCount = purchaseByProductId.get(row.id) ?? 0;
    const score = purchaseCount * 3 + row.reviewCount * 2 + row.clickCount * 1;
    return { row, score };
  });
   // 품절 상품은 인기 점수와 상관없이 항상 맨 뒤로 밀어낸다 (홈/카테고리 위쪽엔 살 수 있는 상품만 보이게).
  withScore.sort((a, b) => {
    if (a.row.soldOut !== b.row.soldOut) return a.row.soldOut ? 1 : -1;
    return b.score - a.score;
  });

  return withScore.map(({ row }) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    extraCategories: row.extraCategories && row.extraCategories.length > 0 ? row.extraCategories : undefined,
    farm: row.farm,
    region: row.region,
    price: row.price,
    originalPrice: row.originalPrice,
    unit: row.unit,
    badge: (row.badge as Product["badge"]) ?? undefined,
    soldOut: row.soldOut,
    rating: row.rating,
    reviewCount: row.reviewCount,
    image: row.image,
    images: row.hasImage ? [`/api/product-image/${row.id}?field=images&index=0`] : undefined,
    description: "",
    supplierId: row.supplierId,
    maxQty: row.maxQty ?? undefined,
    options: row.options ?? undefined,
  }));
}

export async function incrementProductClick(id: string): Promise<void> {
  await db
    .update(productsTable)
    .set({ clickCount: sql`${productsTable.clickCount} + 1` })
    .where(eq(productsTable.id, id));
}

export async function getVisibleProductById(id: string): Promise<Product | undefined> {
  const rows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id))
    .limit(1);
  const row = rows[0];
  if (!row || !row.visible) return undefined;
  return toProduct(row);
}

export async function getVisibleProductsByCategory(slug: string): Promise<Product[]> {
  const all = await getVisibleProducts();
  if (slug === "time-sale") return all.filter((p) => p.badge === "타임특가");
  if (slug === "direct") return all.filter((p) => p.badge === "산지직송");
  return all.filter((p) => p.category === slug || p.extraCategories?.includes(slug));
}

export async function getVisibleProductsByCategoryForList(slug: string): Promise<Product[]> {
  const all = await getVisibleProductsForList();
  if (slug === "time-sale") return all.filter((p) => p.badge === "타임특가");
  if (slug === "direct") return all.filter((p) => p.badge === "산지직송");
  return all.filter((p) => p.category === slug || p.extraCategories?.includes(slug));
}

export type AdminProduct = Product & { visible: boolean };

function toAdminProduct(row: typeof productsTable.$inferSelect): AdminProduct {
  return { ...toProduct(row), visible: row.visible };
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  const rows = await db.select().from(productsTable).orderBy(asc(productsTable.createdAt));
  return rows.map(toAdminProduct);
}

export async function countAllProducts(): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(productsTable);
  return Number(row?.count ?? 0);
}

export async function getAdminProductById(id: string): Promise<AdminProduct | undefined> {
  const rows = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  const row = rows[0];
  return row ? toAdminProduct(row) : undefined;
}

export type ProductInput = {
  name: string;
  category: string;
  extraCategories?: string[];
  farm: string;
  region: string;
  price: number;
  originalPrice: number;
  unit: string;
  badge?: Product["badge"];
  description: string;
  images: string[];
  detailImages: string[];
  supplierId: string;
  supplierProductCode?: string;
  maxQty?: number;
  options?: { label: string; price: number; code?: string }[];
};

export async function createAdminProduct(input: ProductInput): Promise<AdminProduct> {
  const id = `p-${Date.now()}`;
  const [row] = await db
    .insert(productsTable)
    .values({
      id,
      name: input.name,
      category: input.category,
      extraCategories: input.extraCategories ?? [],
      farm: input.farm,
      region: input.region,
      price: input.price,
      originalPrice: input.originalPrice,
      unit: input.unit,
      badge: input.badge ?? null,
      rating: 5,
      reviewCount: 0,
      image: input.images[0] ?? "🥬",
      images: input.images,
      detailImages: input.detailImages,
      description: input.description,
      supplierId: input.supplierId,
      supplierProductCode: input.supplierProductCode || null,
      maxQty: input.maxQty ?? null,
      options: input.options ?? null,
      visible: true,
    })
    .returning();
  return toAdminProduct(row);
}

export async function updateAdminProduct(
  id: string,
  input: ProductInput
): Promise<AdminProduct | undefined> {
  const [row] = await db
    .update(productsTable)
    .set({
      name: input.name,
      category: input.category,
      extraCategories: input.extraCategories ?? [],
      farm: input.farm,
      region: input.region,
      price: input.price,
      originalPrice: input.originalPrice,
      unit: input.unit,
      badge: input.badge ?? null,
      image: input.images[0] ?? "🥬",
      images: input.images,
      detailImages: input.detailImages,
      description: input.description,
      supplierId: input.supplierId,
      supplierProductCode: input.supplierProductCode || null,
      maxQty: input.maxQty ?? null,
      options: input.options ?? null,
      updatedAt: new Date(),
    })
    .where(eq(productsTable.id, id))
    .returning();
  return row ? toAdminProduct(row) : undefined;
}

export async function updateAdminProductPrice(id: string, price: number): Promise<void> {
  await db.update(productsTable).set({ price, updatedAt: new Date() }).where(eq(productsTable.id, id));
}

export async function setAdminProductVisible(id: string, visible: boolean): Promise<void> {
  await db.update(productsTable).set({ visible, updatedAt: new Date() }).where(eq(productsTable.id, id));
}

export async function setProductSoldOut(id: string, soldOut: boolean): Promise<void> {
  await db.update(productsTable).set({ soldOut, updatedAt: new Date() }).where(eq(productsTable.id, id));
}

export async function deleteAdminProduct(id: string): Promise<void> {
  await db.delete(productsTable).where(eq(productsTable.id, id));
}

export async function bulkSetVisible(ids: string[], visible: boolean): Promise<void> {
  await Promise.all(ids.map((id) => setAdminProductVisible(id, visible)));
}

export async function bulkMoveCategory(ids: string[], category: string): Promise<void> {
  await Promise.all(
    ids.map((id) => db.update(productsTable).set({ category, updatedAt: new Date() }).where(eq(productsTable.id, id)))
  );
}
/** 선택한 상품들의 공급업체(발주처)를 한 번에 바꿈 */
export async function bulkMoveSupplier(ids: string[], supplierId: string): Promise<void> {
  await Promise.all(
    ids.map((id) =>
      db
        .update(productsTable)
        .set({ supplierId, updatedAt: new Date() })
        .where(eq(productsTable.id, id))
    )
  );
}
export async function bulkDeleteProducts(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteAdminProduct(id)));
}

export type SupplierProductInfo = {
  code: string | null;
  options: { label: string; price: number; code?: string }[] | null;
};

/** 주문 엑셀 내보내기용 — 상품별 발주코드와 옵션 목록(옵션별 코드 포함)을 한 번에 조회 */
export async function getSupplierProductCodes(
  productIds: string[]
): Promise<Map<string, SupplierProductInfo>> {
  const map = new Map<string, SupplierProductInfo>();
  if (productIds.length === 0) return map;
  const rows = await db
    .select({
      id: productsTable.id,
      code: productsTable.supplierProductCode,
      options: productsTable.options,
    })
    .from(productsTable)
    .where(inArray(productsTable.id, productIds));
  for (const r of rows) map.set(r.id, { code: r.code, options: r.options ?? null });
  return map;
}
