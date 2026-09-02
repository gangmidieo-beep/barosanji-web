import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { recordVisit } from "@/lib/db-visits";

export const dynamic = "force-dynamic";
const COOKIE = "bs_vid";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let vid = req.cookies.get(COOKIE)?.value;
    const isNew = !vid;
    if (!vid) vid = randomBytes(12).toString("hex");

    await recordVisit(vid, String(body?.path ?? "/"), String(body?.source ?? "직접"));

    const res = NextResponse.json({ ok: true });
    if (isNew) {
      res.cookies.set(COOKIE, vid, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }
    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
