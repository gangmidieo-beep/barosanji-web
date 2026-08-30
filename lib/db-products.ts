import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products as productsTable } from "@/db/schema";
import type { Product } from "@/lib/data";

/**
 * 서버 컴포넌트/서버 전용 코드에서 DB의 상품을 읽어와 기존 Product 타입 모양으로 바꿔주는 곳.
 * 화면 쪽(카드/상세페이지 등) 컴포넌트는 이 함수들이 반환하는 값을 기존 lib/data.ts의
 * Product 타입과 똑같이 다루면 되므로, 화면 컴포넌트 코드는 거의 안 바뀝니다.
 */
function toProduct(row: typeof productsTable.$inferSelect): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    farm: row.farm,
    region: row.region,
    price: row.price,
    originalPrice: row.originalPrice,
    unit: row.unit,
    badge: (row.badge as Product["badge"]) ?? undefined,
    rating: row.rating,
    reviewCount: row.reviewCount,
    image: row.image,
    images: row.images && row.images.length > 0 ? row.images : undefined,
    detailImages: row.detailImages && row.detailImages.length > 0 ? row.detailImages : undefined,
    description: row.description,
    supplierId: row.supplierId,
    maxQty: row.maxQty ?? undefined,
    options: row.options ?? undefined,
  };
}

/** 쇼핑몰 화면(고객)에 보여줄 상품 — 숨김 처리된 상품은 제외 */
export async function getVisibleProducts(): Promise<Product[]> {
  const rows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.visible, true))
    .orderBy(asc(productsTable.createdAt));
  return rows.map(toProduct);
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

/** 홈/카테고리 화면에서 쓰는 카테고리별 상품 필터 (data.ts의 getProductsByCategory와 동일한 규칙) */
export async function getVisibleProductsByCategory(slug: string): Promise<Product[]> {
  const all = await getVisibleProducts();
  if (slug === "time-sale") return all.filter((p) => p.badge === "타임특가");
  if (slug === "direct") return all.filter((p) => p.badge === "산지직송");
  if (slug === "event") return all;
  return all.filter((p) => p.category === slug);
}

// ── 아래부터는 관리자 화면(쓰기 작업) 전용 ────────────────────────────────

export type AdminProduct = Product & { visible: boolean };

function toAdminProduct(row: typeof productsTable.$inferSelect): AdminProduct {
  return { ...toProduct(row), visible: row.visible };
}

/** 관리자 상품 목록 — 숨김 상품 포함 전체 */
export async function listAdminProducts(): Promise<AdminProduct[]> {
  const rows = await db.select().from(productsTable).orderBy(asc(productsTable.createdAt));
  return rows.map(toAdminProduct);
}

export type ProductInput = {
  name: string;
  category: string;
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
  maxQty?: number;
  options?: { label: string; price: number }[];
};

export async function createAdminProduct(input: ProductInput): Promise<AdminProduct> {
  const id = `p-${Date.now()}`;
  const [row] = await db
    .insert(productsTable)
    .values({
      id,
      name: input.name,
      category: input.category,
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

export async function bulkDeleteProducts(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteAdminProduct(id)));
}
