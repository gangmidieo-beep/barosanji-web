import { db, pool } from "./client";
import { products as productsTable, suppliers as suppliersTable } from "./schema";
import { products as seedProducts } from "../lib/data";
import { suppliers as seedSuppliers } from "../lib/suppliers";

/**
 * 처음 배포할 때 딱 한 번, DB가 비어있으면 기존 코드에 있던 예시 상품/거래처를
 * 그대로 넣어줍니다. 이미 데이터가 있으면 아무것도 하지 않아요(중복 삽입 방지) —
 * 그래서 배포할 때마다 실행해도 안전합니다.
 */
async function main() {
  const existingSuppliers = await db.select().from(suppliersTable).limit(1);
  if (existingSuppliers.length === 0) {
    console.log("[db] 거래처 초기 데이터 삽입 중...");
    await db.insert(suppliersTable).values(seedSuppliers.map((s) => ({ id: s.id, name: s.name, envKey: s.envKey })));
  }

  const existingProducts = await db.select().from(productsTable).limit(1);
  if (existingProducts.length === 0) {
    console.log("[db] 상품 초기 데이터 삽입 중...");
    await db.insert(productsTable).values(
      seedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        extraCategories: p.extraCategories ?? [],
        farm: p.farm,
        region: p.region,
        price: p.price,
        originalPrice: p.originalPrice,
        unit: p.unit,
        badge: p.badge ?? null,
        rating: p.rating,
        reviewCount: p.reviewCount,
        image: p.image,
        images: p.images ?? [],
        detailImages: p.detailImages ?? [],
        description: p.description,
        supplierId: p.supplierId,
        maxQty: p.maxQty ?? null,
        options: p.options ?? null,
        visible: true,
      }))
    );
  }

  console.log("[db] 시드 확인 완료");
  await pool.end();
}

main().catch((err) => {
  console.error("[db] 시드 실패", err);
  process.exit(1);
});
