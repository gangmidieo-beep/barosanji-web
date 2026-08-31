import { asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { products as productsTable, orders as ordersTable, orderItems as orderItemsTable } from "@/db/schema";
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

/**
 * 홈/카테고리 "목록" 화면 전용 — 상품 카드는 사진을 1장(썸네일)만 보여주면 되는데,
 * getVisibleProducts()는 상품마다 사진을 여러 장(용량 큰 base64) 통째로 DB에서 읽어와서
 * 상품이 많아질수록(지금 50개 이상) 홈 화면이 눈에 띄게 느려지는 원인이 됐다.
 * 여기서는 사진 배열 내용 자체는 DB에서 아예 안 읽어오고, "사진이 있는지 여부"만 계산해서
 * 있으면 /api/product-image 경로(필요할 때 그 상품 사진 1장만 따로 가져오는 이미 있는 API)로
 * 연결한다 — 그래서 목록 조회 자체가 훨씬 가벼워진다.
 *
 * 정렬 순서는 등록일순이 아니라 "인기 점수" 내림차순이다.
 * 인기 점수 = 구매수량 × 3 + 리뷰수 × 2 + 클릭수 × 1
 * (구매가 제일 확실한 신호라서 가장 높은 가중치, 그다음 리뷰, 클릭이 제일 낮음.
 *  비율을 바꾸고 싶으면 이 함수 안의 계산식 숫자만 고치면 됨)
 */
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
    // 실제 결제완료(이상 단계)된 주문만 "구매"로 집계 — 결제대기/결제취소는 제외.
    // 옵션이 있는 상품은 장바구니에 "원래상품ID::옵션명" 형태로 담기므로, "::" 앞부분만 잘라서
    // 원래 상품 기준으로 합산한다.
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
  withScore.sort((a, b) => b.score - a.score);

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

/** 상품 상세페이지 조회수를 1 늘림 — "클릭 많은 순" 정렬에 쓰임. 실패해도 화면엔 영향 없음 */
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

/** 홈/카테고리 화면에서 쓰는 카테고리별 상품 필터 (data.ts의 getProductsByCategory와 동일한 규칙) */
export async function getVisibleProductsByCategory(slug: string): Promise<Product[]> {
  const all = await getVisibleProducts();
  if (slug === "time-sale") return all.filter((p) => p.badge === "타임특가");
  if (slug === "direct") return all.filter((p) => p.badge === "산지직송");
  return all.filter((p) => p.category === slug || p.extraCategories?.includes(slug));
}

/** getVisibleProductsByCategory의 가벼운 버전 — 목록 화면(홈/카테고리)에서 사용 */
export async function getVisibleProductsByCategoryForList(slug: string): Promise<Product[]> {
  const all = await getVisibleProductsForList();
  if (slug === "time-sale") return all.filter((p) => p.badge === "타임특가");
  if (slug === "direct") return all.filter((p) => p.badge === "산지직송");
  return all.filter((p) => p.category === slug || p.extraCategories?.includes(slug));
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

/** 대시보드용 — 상품 전체 개수만 가볍게 셈 (숨김 포함, 상품 관리 화면 숫자와 동일 기준) */
export async function countAllProducts(): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(productsTable);
  return Number(row?.count ?? 0);
}

/** 관리자 상품 상세(수정 화면용) — 상품 1개, 사진 전체 포함해서 가져옴 */
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

/** 품절 여부만 바꿈 — 화면 노출은 그대로 두고 구매만 막거나 다시 풀 때 사용 */
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

export async function bulkDeleteProducts(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteAdminProduct(id)));
}
