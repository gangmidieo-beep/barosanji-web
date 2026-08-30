import { NextRequest, NextResponse } from "next/server";
import { KAKAO_SESSION_COOKIE, createSessionCookieValue } from "@/lib/kakao-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateNext = req.nextUrl.searchParams.get("state") ?? "/";
  const safeNext = stateNext.startsWith("/") ? stateNext : "/";

  const restApiKey = process.env.KAKAO_REST_API_KEY;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;

  if (!code || !restApiKey) {
    return NextResponse.redirect(new URL(`${safeNext}?kakao=fail`, req.url));
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const redirectUri = `${siteUrl}/api/auth/kakao/callback`;

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
      return NextResponse.redirect(new URL(`${safeNext}?kakao=fail`, req.url));
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
      return NextResponse.redirect(new URL(`${safeNext}?kakao=fail`, req.url));
    }

    // 3) 이 브라우저를 "카카오 회원 kakaoId"로 인식하는 세션 쿠키 발급
    const cookieValue = createSessionCookieValue({ kakaoId, nickname });
    const res = NextResponse.redirect(new URL(`${safeNext}?kakao=ok`, req.url));
    res.cookies.set(KAKAO_SESSION_COOKIE, cookieValue, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30일 유지
    });
    return res;
  } catch {
    return NextResponse.redirect(new URL(`${safeNext}?kakao=fail`, req.url));
  }
}
