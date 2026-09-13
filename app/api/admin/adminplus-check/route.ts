import { NextRequest, NextResponse } from "next/server";
import { getSupplierCredentials, isSupplierConfigured } from "@/lib/suppliers";
import { listSuppliers } from "@/lib/db-suppliers";

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

async function tryToken(clientId: string, clientSecret: string) {
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret });
  const res = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
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
    httpStatus: res.status,
    ok: res.ok && !!accessToken,
    accessToken,
    expiresIn: json?.data?.expires_in ?? json?.expires_in ?? null,
    message: json?.message ?? (text ? text.slice(0, 200) : null),
  };
}

async function checkOne(envKey: string) {
  if (!isSupplierConfigured(envKey)) {
    return { envKey, configured: false, note: "ADMINPLUS_CLIENT_ID/SECRET 미설정" };
  }
  const creds = getSupplierCredentials(envKey)!;
  const ids = Array.from(new Set([normalizeCred(creds.clientId), creds.clientId]));
  const secrets = Array.from(new Set([normalizeCred(creds.clientSecret), creds.clientSecret]));

  const started = Date.now();
  let last: Awaited<ReturnType<typeof tryToken>> | null = null;
  let usedEncoding = "";
  for (const id of ids) {
    for (const secret of secrets) {
      try {
        const r = await tryToken(id, secret);
        last = r;
        if (r.ok) {
          usedEncoding = id === creds.clientId ? "raw(원본)" : "decoded(디코딩)";
          const t = r.accessToken!;
          return {
            envKey,
            configured: true,
            httpStatus: r.httpStatus,
            ok: true,
            tokenIssued: true,
            tokenPreview: `${String(t).slice(0, 6)}…`,
            expiresIn: r.expiresIn,
            usedEncoding,
            message: r.message,
            tookMs: Date.now() - started,
            clientIdTail: creds.clientId.slice(-6),
          };
        }
      } catch (e) {
        return { envKey, configured: true, ok: false, error: e instanceof Error ? e.message : "네트워크 오류" };
      }
    }
  }
  return {
    envKey,
    configured: true,
    httpStatus: last?.httpStatus ?? 0,
    ok: false,
    tokenIssued: false,
    message: last?.message ?? "실패",
    tookMs: Date.now() - started,
    clientIdTail: creds.clientId.slice(-6),
  };
}


export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams.get("supplier") || "all";

  // 반드시 DB(suppliers 테이블)의 env_key로 확인한다.
  // 실제 발주도 DB의 env_key로 자격증명을 찾기 때문에, 코드에 하드코딩된 목록으로 확인하면
  // "여기선 되는데 발주는 안 나가는" 불일치를 놓친다 (조용한 발주 누락의 주원인).
  const dbSuppliers = await listSuppliers();
  const targets =
    sp.toLowerCase() === "all"
      ? dbSuppliers
      : dbSuppliers.filter(
          (s) => s.envKey.toUpperCase() === sp.toUpperCase() || s.id === sp
        );

  const results = [];
  for (const s of targets) {
    const check = await checkOne(s.envKey);
    results.push({
      supplierId: s.id,
      supplierName: s.name,
      orderingEnabled: s.orderingEnabled,
      기대하는_환경변수: `ADMINPLUS_CLIENT_ID_${s.envKey} / ADMINPLUS_CLIENT_SECRET_${s.envKey}`,
      ...check,
    });
  }

  const broken = results.filter((r) => r.orderingEnabled && !r.ok);
  return NextResponse.json(
    {
      base: BASE,
      checkedAt: new Date().toISOString(),
      요약:
        broken.length === 0
          ? "발주 사용중인 업체는 모두 정상입니다."
          : `발주가 나가지 않는 업체 ${broken.length}곳: ${broken
              .map((b) => `${b.supplierName}(${b.envKey})`)
              .join(", ")}`,
      results,
    },
    { status: 200 }
  );
}
