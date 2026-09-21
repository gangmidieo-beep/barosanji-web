import { NextRequest, NextResponse } from "next/server";
import {
  importSupplierProducts,
  pruneSupplierProducts,
  type ImportItem,
} from "@/lib/db-products";

/**
 * 거래처 상품 일괄등록.
 * 마지막 묶음에서 prune=true가 오면, 이번 목록에 없는 그 거래처의 옛 상품을 정리한다.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items: ImportItem[] = Array.isArray(body)
    ? body
    : Array.isArray(body?.items)
      ? body.items
      : [];

  if (items.length === 0) {
    return NextResponse.json(
      { success: false, errorMessage: "등록할 상품이 없습니다." },
      { status: 400 }
    );
  }

  const result = await importSupplierProducts(items);

  let deleted = 0;
  if (body?.prune && typeof body.supplierId === "string" && Array.isArray(body.keepCodes)) {
    deleted = await pruneSupplierProducts(body.supplierId, body.keepCodes);
  }

  return NextResponse.json({ success: true, ...result, deleted });
}
