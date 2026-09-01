import { NextRequest, NextResponse } from "next/server";
import {
  getSupplierCredentials,
  isSupplierConfigured,
  suppliers,
} from "@/lib/suppliers";

/**
 * 관리자 전용 진단 라우트 — 결제 없이 어드민플러스 토큰 발급이 되는지(401 해결 여부) 확인한다.
 * 사용: /api/admin/adminplus-check?supplier=PANGINE  (supplier=all 이면 전체 업체)
 * 미들웨어(/api/admin/*)가 관리자 세션으로 보호하므로 로그인 상태에서만 열린다.
 * 보안: access_token 전체는 노출하지 않고 발급 성공 여부/앞 6자만 보여준다.
 */
export const dynamic = "force-dynamic";

const BASE = process.env.ADMINPLUS_API_BASE || "https://api.adminplus.co.kr";

// 패널이 %3D%3D처럼 URL 인코딩해서 보여줄 수 있어 실제 값으로 정규화 (adminplus.ts와 동일 로직)
function normalizeCred(v: string): string {
  try {
    if (/%[0-9A-Fa-f]{2}/.test(v)) return decodeURIComponent(v);
  } catch {
    /* 무시 */
  }
  return v;
}

async function checkOne(envKey: string) {
  if (!isSupplierConfigured(envKey)) {
    return { envKey, configured: false, note: "ADMINPLUS_CLIENT_ID/SECRET 미설정" };
  }
  const creds = getSupplierCredentials(envKey)!;
  const body = new URLSearchParams({
    client_id: normalizeCred(creds.clientId),
    client_secret: normalizeCred(creds.clientSecret),
  });

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(`${BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch (e) {
    return {
      envKey,
      configured: true,
      ok: false,
      error: e instanceof Error ? e.message : "네트워크 오류",
    };
  }

  let text = "";
  let json: { data?: { access_token?: string; expires_in?: number }; access_token?: string; expires_in?: number; message?: string } | null = null;
  try {
    text = await res.text();
    json = JSON.parse(text);
  } catch {
    /* JSON 아님 */
  }

  const accessToken = json?.data?.access_token ?? json?.access_token ?? null;
  return {
    envKey,
    configured: true,
    httpStatus: res.status,
    ok: res.ok && !!accessToken,
    tokenIssued: !!accessToken,
    tokenPreview: accessToken ? `${String(accessToken).slice(0, 6)}…` : null,
    expiresIn: json?.data?.expires_in ?? json?.expires_in ?? null,
    message: json?.message ?? (text ? text.slice(0, 300) : null),
    tookMs: Date.now() - started,
    clientIdTail: creds.clientId.slice(-6), // 값 전체 노출 없이 끝 6자만 (%3D%3D 여부 확인용)
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams.get("supplier") || "PANGINE";
  const keys =
    sp.toLowerCase() === "all"
      ? suppliers.map((s) => s.envKey)
      : [sp.toUpperCase()];

  const results = [];
  for (const k of keys) results.push(await checkOne(k));

  return NextResponse.json(
    { base: BASE, checkedAt: new Date().toISOString(), results },
    { status: 200 }
  );
}
