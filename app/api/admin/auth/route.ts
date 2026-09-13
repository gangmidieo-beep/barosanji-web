import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  getAdminCookieDomain,
  isValidAdminPassword,
} from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!isValidAdminPassword(password)) {
    return NextResponse.json({ success: false, errorMessage: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // www 있는 주소와 없는 주소에서 같은 로그인 세션을 쓰기 위해 대표 도메인에 붙인다.
    domain: getAdminCookieDomain(req.headers.get("host")),
    maxAge: 60 * 60 * 24 * 30, // 30일
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ success: true });
  const domain = getAdminCookieDomain(req.headers.get("host"));

  // 도메인 쿠키로 바뀌기 전에 로그인해둔 브라우저에는 호스트 전용 쿠키가 남아 있을 수 있다.
  // 둘 다 지워야 로그아웃이 확실히 된다.
  res.cookies.set(ADMIN_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  if (domain) {
    res.cookies.set(ADMIN_SESSION_COOKIE, "", { path: "/", maxAge: 0, domain });
  }
  return res;
}
