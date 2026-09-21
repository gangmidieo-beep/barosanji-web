import { NextRequest, NextResponse } from "next/server";
import { importSupplierProducts, type ImportItem } from "@/lib/db-products";

/**
 * 거래처 상품 일괄등록.
 * 관리자 화면에서 JSON 파일을 올리면 100개씩 나눠서 여기로 보낸다.
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
  return NextResponse.json({ success: true, ...result });
}
