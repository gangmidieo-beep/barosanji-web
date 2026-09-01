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

  // 환경변수 값 끝에 "/"가 붙어 있으면 redirect_uri가 "...app//api/..." 처럼 슬래시 두 개가
  // 되어 카카오에 등록한 주소와 안 맞게 된다. 그래서 항상 끝 슬래시를 제거한다.
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const siteUrl = rawSiteUrl.trim().replace(/\/+$/, "");
  const redirectUri = `${siteUrl}/api/auth/kakao/callback`;

  const next = req.nextUrl.searchParams.get("next") ?? "/";

  const authUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authUrl.searchParams.set("client_id", restApiKey);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", next);

  // 문제 진단용 — /api/auth/kakao/login?debug=1 로 열면 카카오로 보내는 대신
  // 실제로 어떤 값이 나가는지 화면에 보여준다. (키는 앞 6자리만 표시)
  if (req.nextUrl.searchParams.get("debug") === "1") {
    return NextResponse.json({
      redirectUri,
      siteUrlFromEnv: rawSiteUrl,
      restApiKeyPreview: `${restApiKey.slice(0, 6)}... (총 ${restApiKey.length}자)`,
      authUrl: authUrl.toString(),
      안내:
        "카카오 개발자센터 > 카카오 로그인 > Redirect URI 에 위 redirectUri 값이 '한 글자도 다르지 않게' 등록돼 있어야 합니다.",
    });
  }

  return NextResponse.redirect(authUrl.toString());
}
