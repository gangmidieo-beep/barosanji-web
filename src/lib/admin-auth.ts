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

/**
 * 로그인 쿠키를 어느 도메인에 붙일지 정한다.
 *
 * barosanji.com 과 www.barosanji.com 이 둘 다 같은 앱을 서비스하는데(리다이렉트 없음),
 * 도메인을 지정하지 않으면 쿠키가 "로그인한 그 호스트"에만 붙는다. 그래서 www로 로그인한 뒤
 * www 없는 주소로 관리자 API를 열면 쿠키가 안 실려 "로그인이 필요합니다"가 뜬다.
 * 두 주소에서 같은 세션을 쓰도록 대표 도메인(.barosanji.com)에 붙인다.
 *
 * 단, 레일웨이 기본 도메인(*.up.railway.app)처럼 공용 접미사에 쿠키를 붙이면 브라우저가
 * 통째로 거부해 로그인이 아예 안 되므로, NEXT_PUBLIC_SITE_URL에 적힌 우리 도메인과
 * 맞아떨어질 때만 도메인을 지정하고 그 외에는 지금처럼 호스트 전용으로 둔다.
 */
export function getAdminCookieDomain(requestHost: string | null | undefined): string | undefined {
  if (!requestHost) return undefined;
  const hostname = requestHost.split(":")[0].toLowerCase();

  let siteHostname: string;
  try {
    siteHostname = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").hostname.toLowerCase();
  } catch {
    return undefined;
  }
  if (!siteHostname) return undefined;

  const apex = siteHostname.startsWith("www.") ? siteHostname.slice(4) : siteHostname;
  // 점이 없는 호스트(localhost 등)나 IP 주소에는 도메인 쿠키를 쓰지 않는다.
  if (!apex.includes(".") || /^[\d.]+$/.test(apex)) return undefined;

  if (hostname === apex || hostname.endsWith(`.${apex}`)) return `.${apex}`;
  return undefined;
}
