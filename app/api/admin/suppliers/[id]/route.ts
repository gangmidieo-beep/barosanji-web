import { NextRequest, NextResponse } from "next/server";
import {
  updateSupplierName,
  deleteSupplier,
  setSupplierOrderingEnabled,
} from "@/lib/db-suppliers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ success: false, errorMessage: "잘못된 요청입니다." }, { status: 400 });
  }

  // 발주 사용 여부만 바꾸는 요청 (거래처 이름은 건드리지 않는다)
  if (typeof body.orderingEnabled === "boolean") {
    await setSupplierOrderingEnabled(id, body.orderingEnabled);
    return NextResponse.json({ success: true });
  }

  if (typeof body.name !== "string") {
    return NextResponse.json({ success: false, errorMessage: "잘못된 요청입니다." }, { status: 400 });
  }
  await updateSupplierName(id, body.name);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteSupplier(id);
  return NextResponse.json({ success: true });
}
