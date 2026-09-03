import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PARTNER_SESSION_COOKIE, readPartnerSession } from "./partner-auth";
import { getPartnerById, type Partner } from "./db-partners";

/** 쿠키에서 파트너ID (검증 통과 시) — 없으면 null. API/페이지 공용 */
export async function getPartnerId(): Promise<string | null> {
  const c = await cookies();
  return readPartnerSession(c.get(PARTNER_SESSION_COOKIE)?.value);
}

/** 파트너 페이지 가드 — 로그인 안 됐으면 로그인으로 보냄 */
export async function requirePartner(): Promise<Partner> {
  const id = await getPartnerId();
  if (!id) redirect("/partner/login");
  const p = await getPartnerById(id);
  if (!p) redirect("/partner/login");
  return p;
}
