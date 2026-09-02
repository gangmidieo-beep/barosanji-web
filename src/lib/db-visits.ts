import { sql } from "drizzle-orm";
import { db } from "@/db/client";

// 방문 기록 테이블은 마이그레이션 없이 최초 사용 시 자동 생성한다 (다른 마이그레이션과 충돌 방지).
let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS page_visits (
      id bigserial PRIMARY KEY,
      visitor_id text NOT NULL DEFAULT '',
      path text NOT NULL DEFAULT '',
      source text NOT NULL DEFAULT '직접',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS page_visits_created_idx ON page_visits (created_at)`);
  ensured = true;
}

export async function recordVisit(visitorId: string, path: string, source: string): Promise<void> {
  await ensureTable();
  await db.execute(sql`
    INSERT INTO page_visits (visitor_id, path, source)
    VALUES (${visitorId}, ${path.slice(0, 300)}, ${(source || "직접").slice(0, 60)})
  `);
}

export type VisitStats = {
  todayVisitors: number;
  todayViews: number;
  last7Visitors: number;
  last7Views: number;
  dailySeries: { key: string; value: number }[];
  sources: { name: string; c: number }[];
};

function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v ?? 0) || 0;
}

export async function getVisitStats(): Promise<VisitStats> {
  await ensureTable();

  const totals = (await db.execute(sql`
    SELECT
      COUNT(DISTINCT visitor_id) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date) AS today_visitors,
      COUNT(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date) AS today_views,
      COUNT(DISTINCT visitor_id) FILTER (WHERE created_at >= now() - interval '7 days') AS last7_visitors,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') AS last7_views
    FROM page_visits
  `)) as unknown as { rows: Record<string, unknown>[] };
  const t = totals.rows?.[0] ?? {};

  const daily = (await db.execute(sql`
    SELECT to_char((created_at AT TIME ZONE 'Asia/Seoul')::date, 'FMMM/FMDD') AS d,
           (created_at AT TIME ZONE 'Asia/Seoul')::date AS dt,
           COUNT(DISTINCT visitor_id) AS v
    FROM page_visits
    WHERE created_at >= now() - interval '14 days'
    GROUP BY dt ORDER BY dt
  `)) as unknown as { rows: Record<string, unknown>[] };
  const dailyMap = new Map<string, number>();
  for (const r of daily.rows ?? []) dailyMap.set(String(r.d), num(r.v));

  const KST = 9 * 60 * 60 * 1000;
  const nowKst = new Date(Date.now() + KST);
  const dailySeries: { key: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(nowKst.getTime() - i * 24 * 3600 * 1000);
    const key = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
    dailySeries.push({ key, value: dailyMap.get(key) ?? 0 });
  }

  const src = (await db.execute(sql`
    SELECT source, COUNT(DISTINCT visitor_id) AS c
    FROM page_visits
    WHERE created_at >= now() - interval '7 days'
    GROUP BY source ORDER BY c DESC LIMIT 6
  `)) as unknown as { rows: Record<string, unknown>[] };
  const sources = (src.rows ?? []).map((r) => ({ name: String(r.source ?? "직접"), c: num(r.c) }));

  return {
    todayVisitors: num(t.today_visitors),
    todayViews: num(t.today_views),
    last7Visitors: num(t.last7_visitors),
    last7Views: num(t.last7_views),
    dailySeries,
    sources,
  };
}
