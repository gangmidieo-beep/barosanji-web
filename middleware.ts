import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 상품 상세/카테고리 페이지는 가격·UI가 실시간으로 바뀌는데, 카카오톡 인앱 브라우저 등
  // 일부 웹뷰가 이전 화면을 강하게 캐싱해서 최신 배포가 안 보인다는 문의가 반복돼서
  // 캐시를 쓰지 말라고 명시적으로 응답한다.
  if (pathname.startsWith("/product/") || pathname.startsWith("/category/")) {
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store, must-revalidate");
    return res;
  }

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
  matcher: ["/admin/:path*", "/api/admin/:path*", "/product/:path*", "/category/:path*"],
};
