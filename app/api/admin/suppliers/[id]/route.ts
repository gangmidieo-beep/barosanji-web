import { NextRequest, NextResponse } from "next/server";
import { updateSupplierName, deleteSupplier } from "@/lib/db-suppliers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string") {
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
