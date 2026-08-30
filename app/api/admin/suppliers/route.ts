import { NextResponse } from "next/server";
import { listSuppliers, createSupplier } from "@/lib/db-suppliers";

export async function GET() {
  const suppliers = await listSuppliers();
  return NextResponse.json({ success: true, suppliers });
}

export async function POST() {
  const supplier = await createSupplier();
  return NextResponse.json({ success: true, supplier });
}
