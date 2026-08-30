import { NextRequest, NextResponse } from "next/server";
import { bulkSetVisible, bulkMoveCategory, bulkDeleteProducts } from "@/lib/db-products";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
  if (ids.length === 0) {
    return NextResponse.json({ success: false, errorMessage: "선택된 상품이 없습니다." }, { status: 400 });
  }

  if (body.action === "setVisible") {
    await bulkSetVisible(ids, Boolean(body.visible));
  } else if (body.action === "moveCategory" && typeof body.category === "string") {
    await bulkMoveCategory(ids, body.category);
  } else if (body.action === "delete") {
    await bulkDeleteProducts(ids);
  } else {
    return NextResponse.json({ success: false, errorMessage: "알 수 없는 작업입니다." }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
