import { NextRequest, NextResponse } from "next/server";
import { KAKAO_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/kakao-session";

export async function GET(req: NextRequest) {
  const session = parseSessionCookieValue(req.cookies.get(KAKAO_SESSION_COOKIE)?.value);
  return NextResponse.json({ success: true, session });
}
