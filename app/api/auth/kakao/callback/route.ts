import { NextRequest, NextResponse } from "next/server";
import { KAKAO_SESSION_COOKIE, createSessionCookieValue } from "@/lib/kakao-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateNext = req.nextUrl.searchParams.get("state") ?? "/";
  const safeNext = stateNext.startsWith("/") ? stateNext : "/";

  const restApiKey = process.env.KAKAO_REST_API_KEY;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;

  // Railway는 앱을 내부적으로 localhost:8080에서 실행하기 때문에, req.url을 기준으로
  // 리다이렉트 주소를 만들면 "localhost:8080/..." 같은 접속 불가 주소가 되어버린다.
  // 그래서 되돌아갈 주소는 항상 실제 사이트 주소(NEXT_PUBLIC_SITE_URL) 기준으로 만든다.
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const siteUrl = rawSiteUrl.trim().replace(/\/+$/, "");
  const redirectUri = `${siteUrl}/api/auth/kakao/callback`;
  const backTo = (result: "ok" | "fail") => `${siteUrl}${safeNext}?kakao=${result}`;

  if (!code || !restApiKey) {
    return NextResponse.redirect(backTo("fail"));
  }

  try {
    // 1) 인가코드(code) → 액세스 토큰 교환
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: restApiKey,
      redirect_uri: redirectUri,
      code,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
    });

    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: tokenBody.toString(),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("[kakao callback] 토큰 교환 실패", tokenData);
      return NextResponse.redirect(backTo("fail"));
    }

    // 2) 액세스 토큰 → 카카오 프로필(닉네임) 조회
    const profileRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    const kakaoId = String(profile?.id ?? "");
    const nickname: string =
      profile?.kakao_account?.profile?.nickname ??
      profile?.properties?.nickname ??
      "카카오 회원";

    if (!kakaoId) {
      console.error("[kakao callback] 프로필 조회 실패", profile);
      return NextResponse.redirect(backTo("fail"));
    }

    // 3) 이 브라우저를 "카카오 회원 kakaoId"로 인식하는 세션 쿠키 발급
    const cookieValue = createSessionCookieValue({ kakaoId, nickname });
    const res = NextResponse.redirect(backTo("ok"));
    res.cookies.set(KAKAO_SESSION_COOKIE, cookieValue, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30일 유지
    });
    return res;
  } catch (e) {
    console.error("[kakao callback] 오류", e);
    return NextResponse.redirect(backTo("fail"));
  }
}
