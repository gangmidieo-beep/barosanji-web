import { NextResponse } from "next/server";
import { getAccessToken, isNaverCommerceConfigured, resetTokenCache } from "@/lib/naver-commerce";

/**
 * 관리자 전용 진단 — 이 서버에서 커머스API 토큰이 발급되는지 확인한다.
 * 사용: /api/admin/naver/check
 *
 * 커머스API는 커머스API센터에 등록한 IP에서만 호출이 되므로, 실패했을 때
 * "자격증명이 틀린 건지 / IP가 안 걸린 건지"를 구분할 수 있게 서버의 아웃바운드 IP도 같이 보여준다.
 * 이 IP를 커머스API센터 > 애플리케이션 > API호출 IP 에 등록해야 한다.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 이 서버가 외부로 나갈 때 쓰는 공인 IP (커머스API센터에 등록할 값) */
async function getOutboundIp(): Promise<string | null> {
  for (const url of ["https://api.ipify.org", "https://ifconfig.me/ip"]) {
    try {
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const ip = (await res.text()).trim();
      if (/^[0-9.]+$/.test(ip)) return ip;
    } catch {
      /* 다음 후보로 */
    }
  }
  return null;
}

export async function GET() {
  const outboundIp = await getOutboundIp();

  if (!isNaverCommerceConfigured()) {
    return NextResponse.json({
      ok: false,
      단계: "자격증명",
      메시지:
        "NAVER_COMMERCE_CLIENT_ID / NAVER_COMMERCE_CLIENT_SECRET 환경변수가 없습니다. " +
        "레일웨이 Variables에 등록하고 재배포해주세요.",
      이_서버의_호출_IP: outboundIp,
    });
  }

  resetTokenCache(); // 캐시된 토큰이 아니라 실제로 새로 발급되는지 본다
  try {
    const token = await getAccessToken();
    return NextResponse.json({
      ok: true,
      단계: "완료",
      메시지: "커머스API 토큰 발급 성공 — 이 서버에서 상품 조회/수정이 가능합니다.",
      토큰_앞자리: token.slice(0, 6),
      이_서버의_호출_IP: outboundIp,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const ipBlocked = /IP|허용되지/i.test(message);
    return NextResponse.json({
      ok: false,
      단계: ipBlocked ? "호출 IP 미등록" : "토큰 발급",
      메시지: message,
      이_서버의_호출_IP: outboundIp,
      해야할_일: ipBlocked
        ? `커머스API센터 > 내 정보 > 내 스토어 애플리케이션 > 애플리케이션 > 수정 > API호출 IP 에 ` +
          `${outboundIp ?? "이 서버의 IP"} 를 추가하세요. (최대 3개까지 등록 가능)`
        : "애플리케이션 ID/시크릿이 레일웨이 환경변수와 일치하는지 확인해주세요.",
    });
  }
}
