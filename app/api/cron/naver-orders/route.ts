import { NextRequest, NextResponse } from "next/server";
import { isNaverCommerceConfigured } from "@/lib/naver-commerce";
import { collectSmartstoreOrders, nextSyncWindow } from "@/lib/naver-orders";

/**
 * 스케줄러가 주기적으로 부르는 주문 수집 엔드포인트.
 * 관리자 세션이 없으므로 CRON_SECRET 으로 보호한다 (미들웨어의 /api/admin 보호 밖에 있음).
 *
 *   GET /api/cron/naver-orders?key=<CRON_SECRET>
 *
 * CRON_SECRET 이 설정되어 있지 않으면 아무도 호출할 수 없도록 막는다.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, errorMessage: "CRON_SECRET 환경변수가 설정되어 있지 않아 비활성 상태입니다." },
      { status: 503 }
    );
  }
  const key = req.nextUrl.searchParams.get("key") ?? req.headers.get("x-cron-key") ?? "";
  if (key !== secret) {
    return NextResponse.json({ ok: false, errorMessage: "인증 실패" }, { status: 401 });
  }
  if (!isNaverCommerceConfigured()) {
    return NextResponse.json({ ok: false, errorMessage: "커머스API 자격증명이 없습니다." }, { status: 400 });
  }

  try {
    const window = await nextSyncWindow();
    const result = await collectSmartstoreOrders(window);
    console.log("[naver orders cron]", {
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      신규: result.신규저장,
      발주성공: result.발주성공,
      발주실패: result.발주실패,
      매칭필요: result.매칭필요,
    });
    // 사람이 확인해야 하는 건은 에러 로그로 올려 눈에 띄게 한다
    if (result.발주실패 > 0 || result.매칭필요 > 0) {
      console.error("[naver orders cron] 확인 필요", {
        발주실패: result.발주실패,
        매칭필요: result.매칭필요,
        상세: result.상세.filter((d) => d.상태 === "발주실패" || d.상태 === "매칭필요"),
      });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[naver orders cron] 실패", message);
    return NextResponse.json({ ok: false, errorMessage: message }, { status: 502 });
  }
}
