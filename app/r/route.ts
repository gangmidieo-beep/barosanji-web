import { NextRequest, NextResponse } from "next/server";
import { getLinkByCode, recordClick, makeRefCookie, REF_COOKIE } from "@/lib/affiliate";

// crypto(HMAC)를 쓰므로 node 런타임 필요
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 파트너 추천 링크: /r?ref=코드  (대괄호 경로 대신 쿼리 방식 — 만들기 쉬움)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("ref") || "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  let dest = `${siteUrl}/`;

  try {
    if (code) {
      const link = await getLinkByCode(code);
      if (link) {
        await recordClick(link.id, link.partnerId).catch(() => {});
        if (link.productId) dest = `${siteUrl}/product/${link.productId}`;
        const res = NextResponse.redirect(dest);
        res.cookies.set(REF_COOKIE, makeRefCookie(link.partnerId, link.id), {
          httpOnly: true,
          sameSite: "lax",
          maxAge: 30 * 60,
          path: "/",
        });
        return res;
      }
    }
  } catch {
    /* 무시하고 홈으로 */
  }
  return NextResponse.redirect(dest);
}
