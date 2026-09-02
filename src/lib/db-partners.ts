import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { partners as partnersTable } from "@/db/schema";
import { hashPassword } from "./partner-auth";

export type Partner = {
  id: string;
  email: string;
  name: string;
  refCode: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
};

function genRefCode(): string {
  // 8자리 대문자/숫자 (추천 코드)
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export async function getPartnerAuthByEmail(
  email: string
): Promise<{ id: string; passwordHash: string } | null> {
  const rows = await db
    .select({ id: partnersTable.id, passwordHash: partnersTable.passwordHash })
    .from(partnersTable)
    .where(eq(partnersTable.email, email))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPartnerById(id: string): Promise<Partner | null> {
  const rows = await db
    .select({
      id: partnersTable.id,
      email: partnersTable.email,
      name: partnersTable.name,
      refCode: partnersTable.refCode,
      bankName: partnersTable.bankName,
      bankAccount: partnersTable.bankAccount,
      bankHolder: partnersTable.bankHolder,
    })
    .from(partnersTable)
    .where(eq(partnersTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createPartner(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const existing = await db
    .select({ id: partnersTable.id })
    .from(partnersTable)
    .where(eq(partnersTable.email, input.email))
    .limit(1);
  if (existing[0]) return { ok: false, error: "이미 가입된 이메일입니다." };

  const id = `ptn-${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}`;
  let refCode = genRefCode();
  for (let i = 0; i < 4; i++) {
    const dup = await db
      .select({ id: partnersTable.id })
      .from(partnersTable)
      .where(eq(partnersTable.refCode, refCode))
      .limit(1);
    if (!dup[0]) break;
    refCode = genRefCode();
  }

  await db.insert(partnersTable).values({
    id,
    email: input.email,
    passwordHash: hashPassword(input.password),
    name: input.name ?? "",
    refCode,
  });
  return { ok: true, id };
}
