import { NextRequest, NextResponse } from "next/server";
import { listAdminProducts, createAdminProduct, type ProductInput } from "@/lib/db-products";

export async function GET() {
  const products = await listAdminProducts();
  return NextResponse.json({ success: true, products });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as ProductInput | null;
  if (!body || !body.name || !body.price) {
    return NextResponse.json({ success: false, errorMessage: "상품명/판매가는 필수입니다." }, { status: 400 });
  }
  const product = await createAdminProduct(body);
  return NextResponse.json({ success: true, product });
}
