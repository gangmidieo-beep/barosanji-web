import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users as usersTable } from "@/db/schema";

export type AppUser = {
  kakaoId: string;
  nickname: string;
  email: string;
  phone: string;
  receiverName: string;
  receiverAddress: string;
  receiverAddressDetail: string;
  createdAt: Date;
  lastLoginAt: Date;
};

/** 카카오 로그인 시 회원 upsert — 있으면 로그인(정보 갱신), 없으면 가입 */
export async function upsertKakaoUser(params: {
  kakaoId: string;
  nickname: string;
  email?: string;
}): Promise<void> {
  const now = new Date();
  await db
    .insert(usersTable)
    .values({
      kakaoId: params.kakaoId,
      nickname: params.nickname,
      email: params.email ?? "",
      lastLoginAt: now,
    })
    .onConflictDoUpdate({
      target: usersTable.kakaoId,
      set: {
        nickname: params.nickname,
        ...(params.email ? { email: params.email } : {}),
        lastLoginAt: now,
      },
    });
}

/** 회원 목록 (가입 최신순) */
export async function listUsers(): Promise<AppUser[]> {
  const rows = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  return rows.map((r) => ({ ...r }));
}

/** 카카오ID로 회원 1명 조회 (배송지 자동입력 등에 사용) */
export async function getUserByKakaoId(kakaoId: string): Promise<AppUser | null> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.kakaoId, kakaoId)).limit(1);
  return rows[0] ?? null;
}
