import { NextRequest, NextResponse } from "next/server";
import {
  getAdminProductById,
  updateAdminProduct,
  deleteAdminProduct,
  updateAdminProductPrice,
  setAdminProductVisible,
  type ProductInput,
} from "@/lib/db-products";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getAdminProductById(id);
  if (!product) return NextResponse.json({ success: false, errorMessage: "상품을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ success: true, product });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false, errorMessage: "잘못된 요청입니다." }, { status: 400 });

  // 가격만 인라인으로 바꾸는 경우
  if (typeof body.price === "number" && Object.keys(body).length === 1) {
    await updateAdminProductPrice(id, body.price);
    return NextResponse.json({ success: true });
  }

  // 노출 여부만 바꾸는 경우
  if (typeof body.visible === "boolean" && Object.keys(body).length === 1) {
    await setAdminProductVisible(id, body.visible);
    return NextResponse.json({ success: true });
  }

  const product = await updateAdminProduct(id, body as ProductInput);
  if (!product) return NextResponse.json({ success: false, errorMessage: "상품을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ success: true, product });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteAdminProduct(id);
  return NextResponse.json({ success: true });
}
