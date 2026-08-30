import { NextRequest, NextResponse } from "next/server";
import { KAKAO_SESSION_COOKIE } from "@/lib/kakao-session";

export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") ? next : "/";
  const res = NextResponse.redirect(new URL(safeNext, req.url));
  res.cookies.delete(KAKAO_SESSION_COOKIE);
  return res;
}
