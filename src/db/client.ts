import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * DB 연결 — Next.js 개발 모드에서 파일이 새로고침될 때마다 커넥션 풀이 새로 생기지 않도록
 * 전역(globalThis)에 한 번만 만들어서 재사용합니다.
 */
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL 환경변수가 설정되어 있지 않습니다. Railway에 Postgres를 연결했는지 확인해주세요."
    );
  }
  return new Pool({ connectionString });
}

export const pool = globalThis.__pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__pgPool = pool;

export const db = drizzle(pool, { schema });
