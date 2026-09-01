import crypto from "crypto";

/**
 * 페이맵(PayMap) PG 연동 — 인증결제(/v2/pay/auth) 방식.
 *
 * 흐름:
 *  1) 체크아웃에서 /api/paymap/request 호출 → 주문을 "결제대기"로 DB에 저장하고 폼 값을 받음
 *  2) 브라우저가 그 값으로 페이맵 결제창(form POST)으로 이동
 *  3) 결제 완료 후 페이맵이 서버로 결제통지(Noti)를 보냄 → /api/paymap/noti 에서 주문 확정
 *
 * 주의: 고객이 결제 후 "결제완료" 버튼을 안 누르고 창을 닫으면 return_url로는 아무것도 안 온다.
 * 그래서 주문 확정(DB 반영/발주)은 반드시 Noti 쪽에서 처리해야 한다.
 */

export const PAYMAP_AUTH_URL = "https://api.paymap.co.kr/v2/pay/auth";

export function getPayMapConfig() {
  return {
    mid: process.env.PAYMAP_MID ?? "",
    tid: process.env.PAYMAP_TID ?? "",
    payKey: process.env.PAYMAP_PAY_KEY ?? "",
    signKey: process.env.PAYMAP_SIGN_KEY ?? "",
  };
}

export function isPayMapConfigured(): boolean {
  const c = getPayMapConfig();
  return Boolean(c.mid && c.payKey);
}

/**
 * 결제통지(Noti)의 무결성 검증.
 * 규격: sha256("sign_key=값&timestamp=값&mid=값")
 */
export function verifyPayMapNoti(data: Record<string, string>): boolean {
  const { signKey, mid } = getPayMapConfig();
  // 서명키가 아직 발급/설정 전이면 검증을 건너뛴다(대신 로그로 경고).
  if (!signKey) {
    console.warn("[paymap noti] PAYMAP_SIGN_KEY 미설정 — 서명 검증을 건너뜁니다.");
    return true;
  }
  const raw = `sign_key=${signKey}&timestamp=${data.timestamp ?? ""}&mid=${data.mid ?? ""}`;
  const expected = crypto.createHash("sha256").update(raw, "utf8").digest("hex");
  const ok = expected === (data.signature ?? "").toLowerCase();
  if (!ok) {
    console.error("[paymap noti] 서명 불일치", { mid: data.mid, expectedMid: mid });
  }
  return ok;
}

/** 취소 거래인지 판별 — is_cancel이 "1"이면 취소건 */
export function isCancelNoti(data: Record<string, string>): boolean {
  return String(data.is_cancel ?? "0") === "1";
}
