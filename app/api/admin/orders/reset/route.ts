import { NextResponse } from "next/server";
import { deleteAllOrders } from "@/lib/db-orders";

/**
 * 관리자 전용 — 모든 주문 초기화 (테스트 데이터 정리용).
 * 미들웨어(/api/admin/*)가 관리자 세션으로 보호. 되돌릴 수 없음.
 * 상품/거래처/클릭수/회원은 건드리지 않는다.
 */
export const dynamic = "force-dynamic";

export async function POST() {
  const result = await deleteAllOrders();
  return NextResponse.json({ success: true, deletedOrders: result.deletedOrders });
}
