import { NextRequest, NextResponse } from "next/server";
import { createPartner } from "@/lib/db-partners";
import { makePartnerSession, PARTNER_SESSION_COOKIE } from "@/lib/partner-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "");
  const name = b?.name ? String(b.name) : "";
  if (!email || !password) {
    return NextResponse.json({ success: false, errorMessage: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ success: false, errorMessage: "비밀번호는 6자 이상이어야 해요." }, { status: 400 });
  }
  const r = await createPartner({ email, password, name });
  if (!r.ok) {
    return NextResponse.json({ success: false, errorMessage: r.error }, { status: 400 });
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set(PARTNER_SESSION_COOKIE, makePartnerSession(r.id), {
    httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/",
  });
  return res;
}
