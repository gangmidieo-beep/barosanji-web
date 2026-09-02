import { NextResponse } from "next/server";
import { PARTNER_SESSION_COOKIE } from "@/lib/partner-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(PARTNER_SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
