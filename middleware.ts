import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminApi =
    pathname.startsWith("/api/admin") && pathname !== "/api/admin/auth";
  const isAdminPage =
    pathname.startsWith("/admin") && pathname !== "/admin/login";

  if (!isAdminApi && !isAdminPage) return NextResponse.next();

  const session = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (isValidAdminSession(session)) return NextResponse.next();

  if (isAdminApi) {
    return NextResponse.json(
      { success: false, errorMessage: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const loginUrl = new URL("/admin/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
