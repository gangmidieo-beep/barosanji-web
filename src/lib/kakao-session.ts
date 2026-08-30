import crypto from "crypto";

/**
 * 카카오 로그인한 고객을 "이 브라우저는 카카오 회원 누구다"라고 식별하기 위한
 * 아주 단순한 세션 쿠키. 관리자 로그인(admin-auth.ts)과 비슷한 정신으로,
 * 별도 회원 DB 없이 쿠키 하나로 처리한다. (닉네임 식별용 — 결제/개인정보는 다루지 않음)
 */
export const KAKAO_SESSION_COOKIE = "kakao_session";

export type KakaoSession = {
  kakaoId: string;
  nickname: string;
};

function getSecret(): string {
  return (
    process.env.KAKAO_CLIENT_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "barosanji-kakao-session"
  );
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

/** 세션 정보를 쿠키에 넣을 문자열로 변환 (위조 방지를 위해 서명 포함) */
export function createSessionCookieValue(session: KakaoSession): string {
  const payload = Buffer.from(JSON.stringify(session), "utf-8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** 쿠키 문자열을 검증하고 세션 정보로 되돌림. 서명이 안 맞으면(위조/변조) null */
export function parseSessionCookieValue(
  cookieValue: string | undefined | null
): KakaoSession | null {
  if (!cookieValue) return null;
  const dotIndex = cookieValue.lastIndexOf(".");
  if (dotIndex <= 0) return null;
  const payload = cookieValue.slice(0, dotIndex);
  const sig = cookieValue.slice(dotIndex + 1);
  if (sign(payload) !== sig) return null;
  try {
    const json = Buffer.from(payload, "base64url").toString("utf-8");
    const parsed = JSON.parse(json);
    if (typeof parsed?.kakaoId === "string" && typeof parsed?.nickname === "string") {
      return { kakaoId: parsed.kakaoId, nickname: parsed.nickname };
    }
    return null;
  } catch {
    return null;
  }
}
