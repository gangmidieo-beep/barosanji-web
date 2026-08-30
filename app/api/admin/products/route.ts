import { NextRequest, NextResponse } from "next/server";
import { listAdminProducts, createAdminProduct, type ProductInput } from "@/lib/db-products";

// 목록 화면은 상품 카드에 썸네일 1장만 보여주면 되는데, DB엔 상품마다 사진이 여러 장(용량 큰
// base64)씩 들어있어서 전체를 그대로 JSON으로 내려주면 응답이 너무 커져 서버가 죽는 원인이
// 됐다(RangeError: Invalid string length). 그래서 목록에서는 대표 사진 1장만, 그것도 base64
// 그대로가 아니라 /api/product-image 경로로 바꿔서 가볍게 내려준다. 상세 이미지는 목록에서
// 안 쓰이므로 아예 뺀다. (상품 수정 화면을 열 때는 /api/admin/products/[id]에서 전체를 따로 받아온다)
function toListItem(p: Awaited<ReturnType<typeof listAdminProducts>>[number]) {
  const firstImage = p.images && p.images.length > 0 ? p.images[0] : undefined;
  return {
    ...p,
    images: firstImage
      ? [firstImage.startsWith("data:") ? `/api/product-image/${p.id}?field=images&index=0` : firstImage]
      : undefined,
    detailImages: undefined,
  };
}

export async function GET() {
  const products = await listAdminProducts();
  return NextResponse.json({ success: true, products: products.map(toListItem) });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as ProductInput | null;
  if (!body || !body.name || !body.price) {
    return NextResponse.json({ success: false, errorMessage: "상품명/판매가는 필수입니다." }, { status: 400 });
  }
  const product = await createAdminProduct(body);
  return NextResponse.json({ success: true, product });
}
