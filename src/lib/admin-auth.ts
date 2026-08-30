/**
 * 아주 단순한 관리자 로그인 — 계정 여러 개가 필요한 게 아니라 "관리자 화면은 나만 들어갈 수
 * 있어야 한다"는 정도라, 비밀번호 하나(ADMIN_PASSWORD 환경변수)만 확인합니다.
 *
 * 이제 관리자 화면이 진짜 DB에 직접 쓰기 때문에, 로그인 없이 누구나 /admin 주소를 알면
 * 상품을 마음대로 추가/삭제할 수 있게 되는 걸 막기 위한 최소한의 장치입니다.
 */
export const ADMIN_SESSION_COOKIE = "admin_session";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "barosanji-admin-2026";
}

export function isValidAdminPassword(password: string): boolean {
  return password.length > 0 && password === getAdminPassword();
}

export function isValidAdminSession(cookieValue: string | undefined | null): boolean {
  return Boolean(cookieValue) && cookieValue === getAdminPassword();
}
