import { NextResponse } from "next/server";
import { listUsers } from "@/lib/db-users";

export const dynamic = "force-dynamic";

export async function GET() {
  const users = await listUsers();
  return NextResponse.json({ success: true, users });
}
