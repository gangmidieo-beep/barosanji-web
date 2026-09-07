import { NextRequest, NextResponse } from "next/server";
import { listCosts, addCost, deleteCost } from "@/lib/db-channels";
import { kstDateStart } from "@/lib/channel-period";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const [costs, prods] = await Promise.all([
    listCosts(),
    db.select({ id: products.id, name: products.name, price: products.price, unit: products.unit, supplierId: products.supplierId, category: products.category }).from(products).orderBy(asc(products.name)),
  ]);
  return NextResponse.json({ success: true, costs, products: prods });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.productId) return NextResponse.json({ success: false, errorMessage: "상품을 선택해주세요." }, { status: 400 });
  const row = await addCost({
    productId: String(b.productId),
    costPrice: Math.max(0, Math.round(Number(b.costPrice) || 0)),
    shippingCost: Math.max(0, Math.round(Number(b.shippingCost) || 0)),
    packagingCost: Math.max(0, Math.round(Number(b.packagingCost) || 0)),
    effectiveFrom: b.effectiveFrom ? kstDateStart(String(b.effectiveFrom)) : new Date(),
    note: String(b.note ?? ""),
  });
  return NextResponse.json({ success: true, cost: row });
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ success: false, errorMessage: "id가 필요합니다." }, { status: 400 });
  await deleteCost(id);
  return NextResponse.json({ success: true });
}
