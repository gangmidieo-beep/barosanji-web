import { NextRequest, NextResponse } from "next/server";
import { getProfitReport } from "@/lib/db-channels";
import { parsePeriod } from "@/lib/channel-period";

export const dynamic = "force-dynamic";

/** GET /api/admin/channels/summary?period=today|week|month|last30|custom&from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const { from, to } = parsePeriod(sp.get("period"), sp.get("from"), sp.get("to"));
  const report = await getProfitReport(from, to);
  return NextResponse.json({ success: true, report });
}
