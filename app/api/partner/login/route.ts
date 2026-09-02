import { NextRequest, NextResponse } from "next/server";
import { getPartnerAuthByEmail } from "@/lib/db-partners";
import { verifyPassword, makePartnerSession, PARTNER_SESSION_COOKIE } from "@/lib/partner-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ success: false, errorMessage: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
  }
  const auth = await getPartnerAuthByEmail(email);
  if (!auth || !verifyPassword(password, auth.passwordHash)) {
    return NextResponse.json({ success: false, errorMessage: "이메일 또는 비밀번호가 올바르지 않아요." }, { status: 401 });
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set(PARTNER_SESSION_COOKIE, makePartnerSession(auth.id), {
    httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/",
  });
  return res;
}
