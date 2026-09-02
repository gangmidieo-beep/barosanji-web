import crypto from "crypto";

/** 파트너 로그인 세션 (30일, HMAC 서명) + 비밀번호 해시(scrypt) */
export const PARTNER_SESSION_COOKIE = "partner_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function secret(): string {
  return (
    process.env.PARTNER_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "barosanji-partner-fallback-secret"
  );
}

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(pw, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(test, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export function makePartnerSession(partnerId: string): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `${partnerId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

/** 세션 쿠키 검증 → 파트너ID (없거나 만료/위조면 null) */
export function readPartnerSession(value: string | undefined | null): string | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  if (sign(`${id}.${exp}`) !== sig) return null;
  if (Date.now() > Number(exp)) return null;
  return id;
}
