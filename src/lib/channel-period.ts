import { KST_OFFSET } from "./channel-profit";

/** KST 날짜 문자열(YYYY-MM-DD) → 그날 00:00 KST의 UTC Date */
export function kstDateStart(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - KST_OFFSET);
}
export function kstDateEnd(s: string): Date {
  return new Date(kstDateStart(s).getTime() + 24 * 60 * 60 * 1000 - 1);
}
export function todayKst(): string {
  const k = new Date(Date.now() + KST_OFFSET);
  return `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, "0")}-${String(k.getUTCDate()).padStart(2, "0")}`;
}

export type PeriodKey = "today" | "week" | "month" | "last30" | "custom";

export function parsePeriod(period: string | null, fromStr: string | null, toStr: string | null): { from: Date; to: Date; period: PeriodKey } {
  const today = todayKst();
  const todayStart = kstDateStart(today);
  const DAY = 24 * 60 * 60 * 1000;
  switch (period) {
    case "today":
      return { from: todayStart, to: kstDateEnd(today), period: "today" };
    case "week": {
      const k = new Date(todayStart.getTime() + KST_OFFSET);
      const dow = (k.getUTCDay() + 6) % 7; // 월요일=0
      return { from: new Date(todayStart.getTime() - dow * DAY), to: kstDateEnd(today), period: "week" };
    }
    case "last30":
      return { from: new Date(todayStart.getTime() - 29 * DAY), to: kstDateEnd(today), period: "last30" };
    case "custom":
      if (fromStr && toStr) return { from: kstDateStart(fromStr), to: kstDateEnd(toStr), period: "custom" };
      break;
  }
  // 기본: 이번 달
  const monthStart = kstDateStart(today.slice(0, 7) + "-01");
  return { from: monthStart, to: kstDateEnd(today), period: "month" };
}
