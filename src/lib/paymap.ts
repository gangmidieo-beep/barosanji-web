import crypto from "crypto";

/**
 * 페이맵(PayMap) PG 연동 — 인증결제(신용카드) + 간편결제(카카오·네이버), 같은 /v2/pay/auth 주소에
 * 서로 다른 MID/키를 보내 결제창을 구분한다.
 *  1) 체크아웃 → /api/paymap/request(payType) 호출 → 주문 "결제대기" 저장 + 폼값 받음
 *  2) 브라우저가 폼 POST로 페이맵 결제창 이동
 *  3) 결제 완료 후 페이맵이 /api/paymap/noti로 통지 → 주문 확정 (return_url은 신뢰 불가)
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

export function getPayMapEasyConfig() {
  return {
    mid: process.env.PAYMAP_EASY_MID ?? "",
    tid: process.env.PAYMAP_EASY_TID ?? process.env.PAYMAP_TID ?? "",
    payKey: process.env.PAYMAP_EASY_PAY_KEY ?? "",
    signKey: process.env.PAYMAP_EASY_SIGN_KEY ?? "",
  };
}

export function isPayMapEasyConfigured(): boolean {
  const c = getPayMapEasyConfig();
  return Boolean(c.mid && c.payKey);
}

/**
 * 결제통지(Noti)의 무결성 검증.
 * 규격: sha256("sign_key=값&timestamp=값&mid=값")
 */
export function verifyPayMapNoti(data: Record<string, string>): boolean {
  const auth = getPayMapConfig();
  const easy = getPayMapEasyConfig();
  // Noti의 mid로 인증/간편 중 어느 결제 통지인지 구분해 해당 서명키를 사용한다.
  let signKey = auth.signKey;
  if (easy.mid && data.mid === easy.mid) signKey = easy.signKey;
  else if (auth.mid && data.mid === auth.mid) signKey = auth.signKey;

  if (!signKey) {
    console.warn("[paymap noti] 서명키 미설정 — 서명 검증을 건너뜁니다.");
    return true;
  }
  const raw = `sign_key=${signKey}&timestamp=${data.timestamp ?? ""}&mid=${data.mid ?? ""}`;
  const expected = crypto.createHash("sha256").update(raw, "utf8").digest("hex");
  const ok = expected === (data.signature ?? "").toLowerCase();
  if (!ok) {
    console.error("[paymap noti] 서명 불일치", { mid: data.mid });
  }
  return ok;
}

/** 취소 거래인지 판별 — is_cancel이 "1"이면 취소건 */
export function isCancelNoti(data: Record<string, string>): boolean {
  return String(data.is_cancel ?? "0") === "1";
}
