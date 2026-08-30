import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const restApiKey = process.env.KAKAO_REST_API_KEY;
  if (!restApiKey) {
    return NextResponse.json(
      {
        success: false,
        errorMessage:
          "카카오 로그인 설정(KAKAO_REST_API_KEY)이 되어 있지 않습니다. Railway 환경변수를 확인해주세요.",
      },
      { status: 500 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const redirectUri = `${siteUrl}/api/auth/kakao/callback`;

  // 로그인 완료 후 원래 있던 페이지로 되돌아가기 위해 state 파라미터에 담아 보낸다.
  const next = req.nextUrl.searchParams.get("next") ?? "/";

  const authUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authUrl.searchParams.set("client_id", restApiKey);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", next);

  return NextResponse.redirect(authUrl.toString());
}
