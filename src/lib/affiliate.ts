import crypto from "crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { links as linksTable, clicks as clicksTable } from "@/db/schema";

/** 추천인 추적 쿠키 (링크 클릭 후 24시간 유효, HMAC 서명) */
export const REF_COOKIE = "barosanji_ref";
const REF_TTL_MS = 30 * 60 * 1000; // 추천 인정 기한 30분

function secret(): string {
  return (
    process.env.PARTNER_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "barosanji-affiliate-fallback-secret"
  );
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export function makeRefCookie(partnerId: string, linkId: string): string {
  const exp = Date.now() + REF_TTL_MS;
  const payload = `${partnerId}.${linkId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

/** 쿠키 검증 — 서명·만료 확인 후 추천인 정보 반환 (없거나 만료면 null) */
export function parseRefCookie(value: string | undefined): { partnerId: string; linkId: string } | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [partnerId, linkId, expStr, sig] = parts;
  const payload = `${partnerId}.${linkId}.${expStr}`;
  if (sign(payload) !== sig) return null;
  if (Date.now() > Number(expStr)) return null;
  return { partnerId, linkId };
}

export type AffLink = { id: string; partnerId: string; code: string; productId: string | null };

export async function getLinkByCode(code: string): Promise<AffLink | null> {
  const rows = await db
    .select({
      id: linksTable.id,
      partnerId: linksTable.partnerId,
      code: linksTable.code,
      productId: linksTable.productId,
    })
    .from(linksTable)
    .where(eq(linksTable.code, code))
    .limit(1);
  return rows[0] ?? null;
}

export async function recordClick(linkId: string, partnerId: string): Promise<void> {
  await db.insert(clicksTable).values({ linkId, partnerId });
  await db
    .update(linksTable)
    .set({ clickCount: sql`${linksTable.clickCount} + 1` })
    .where(eq(linksTable.id, linkId));
}
