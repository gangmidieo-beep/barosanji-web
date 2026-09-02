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
  return new Pool({
    connectionString,
    max: 20, // 동시 접속(광고 유입) 대응
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // 풀이 꽉 차면 10초 안에 실패 처리 (무한 대기 방지)
    statement_timeout: 20000, // 개별 쿼리 20초 넘으면 중단 (한 요청이 서버 전체를 막는 것 방지)
  });
}

export const pool = globalThis.__pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__pgPool = pool;

export const db = drizzle(pool, { schema });
