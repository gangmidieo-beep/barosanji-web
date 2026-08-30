import { NextResponse } from "next/server";
import { listAdminOrders } from "@/lib/db-orders";

export async function GET() {
  const orders = await listAdminOrders();
  return NextResponse.json({ success: true, orders });
}
