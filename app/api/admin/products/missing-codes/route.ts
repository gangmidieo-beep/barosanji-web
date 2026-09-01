import { NextResponse } from "next/server";
import { listAdminProducts } from "@/lib/db-products";
import { getSupplierById } from "@/lib/suppliers";

/**
 * 관리자 전용 진단 — 발주코드(공급사 상품코드)가 비어있는 상품을 찾아준다.
 * 옵션이 있으면 옵션마다 code, 없으면 상품의 supplierProductCode를 본다.
 * 사용: /api/admin/products/missing-codes
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const products = await listAdminProducts();

  const missing: { id: string; name: string; supplier: string; reason: string }[] = [];

  for (const p of products) {
    const supplier = getSupplierById(p.supplierId);
    const supplierName = supplier?.name ?? p.supplierId ?? "미지정";

    if (p.options && p.options.length > 0) {
      const noCode = p.options.filter((o) => !o.code || !String(o.code).trim());
      if (noCode.length > 0) {
        missing.push({
          id: p.id,
          name: p.name,
          supplier: supplierName,
          reason: `옵션 발주코드 없음: ${noCode.map((o) => o.label).join(", ")}`,
        });
      }
    } else {
      if (!p.supplierProductCode || !String(p.supplierProductCode).trim()) {
        missing.push({
          id: p.id,
          name: p.name,
          supplier: supplierName,
          reason: "상품 발주코드 없음",
        });
      }
    }
  }

  // 업체별 개수 요약
  const bySupplier: Record<string, number> = {};
  for (const m of missing) bySupplier[m.supplier] = (bySupplier[m.supplier] ?? 0) + 1;

  return NextResponse.json({
    totalProducts: products.length,
    missingCount: missing.length,
    bySupplier,
    missing,
  });
}
