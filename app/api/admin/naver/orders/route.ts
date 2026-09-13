import { NextRequest, NextResponse } from "next/server";
import { isNaverCommerceConfigured } from "@/lib/naver-commerce";
import { collectSmartstoreOrders, nextSyncWindow } from "@/lib/naver-orders";

/**
 * 관리자 전용 — 스마트스토어 주문을 수집하고 공급사로 발주까지 보낸다.
 *   GET /api/admin/naver/orders?hours=6&dryRun=1
 * dryRun=1 이면 저장만 하고 발주는 보내지 않는다.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!isNaverCommerceConfigured()) {
    return NextResponse.json(
      { ok: false, errorMessage: "커머스API 자격증명이 없습니다. /api/admin/naver/check 를 먼저 확인하세요." },
      { status: 400 }
    );
  }
  const sp = req.nextUrl.searchParams;
  const dryRun = sp.get("dryRun") === "1";
  const hours = Number(sp.get("hours") ?? 0);

  try {
    const window = hours > 0
      ? { from: new Date(Date.now() - Math.min(hours, 24) * 3600_000), to: new Date() }
      : await nextSyncWindow();
    const result = await collectSmartstoreOrders({ ...window, dryRun });
    return NextResponse.json({
      ok: true,
      조회구간: { from: window.from.toISOString(), to: window.to.toISOString() },
      dryRun,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        errorMessage: message,
        힌트: /IP|허용되지/i.test(message)
          ? "이 서버의 IP가 커머스API센터에 등록되어 있지 않습니다. /api/admin/naver/check 로 IP를 확인하세요."
          : undefined,
      },
      { status: 502 }
    );
  }
}
