import { NextRequest, NextResponse } from "next/server";

/**
 * 공급사 이미지 중계.
 * 공급사 CDN이 외부 사이트에서의 직접 호출(핫링크)을 막는 경우가 있어서,
 * 우리 서버가 대신 받아와 고객에게 넘겨준다. 허용한 도메인만 중계한다.
 */
const ALLOWED_HOSTS = ["cdn.yourlove.co.kr"];

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("u");
  if (!raw) return new NextResponse("missing url", { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }
  if (!ALLOWED_HOSTS.includes(target.hostname)) {
    return new NextResponse("host not allowed", { status: 403 });
  }

  try {
    const res = await fetch(target.toString(), {
      headers: {
        Referer: target.origin + "/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      },
      cache: "force-cache",
    });
    if (!res.ok || !res.body) {
      return new NextResponse("upstream error", { status: 502 });
    }
    return new NextResponse(res.body, {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return new NextResponse("fetch failed", { status: 502 });
  }
}
