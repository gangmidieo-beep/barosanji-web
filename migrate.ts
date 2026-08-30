import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client";

/**
 * 앱이 뜰 때 자동으로 DB 스키마를 최신 상태로 맞춰주는 스크립트.
 * package.json의 start 스크립트에서 `node ... migrate.js && next start` 형태로 실행됩니다.
 * 이미 적용된 마이그레이션은 건너뛰므로 여러 번 실행해도 안전합니다.
 */
async function main() {
  console.log("[db] 마이그레이션 적용 중...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[db] 마이그레이션 완료");
  await pool.end();
}

main().catch((err) => {
  console.error("[db] 마이그레이션 실패", err);
  process.exit(1);
});
