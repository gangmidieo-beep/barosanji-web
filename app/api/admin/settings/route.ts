import { NextRequest, NextResponse } from "next/server";
import { getSiteSettings, updateSiteSettings, type SiteSettingsData } from "@/lib/db-settings";

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json({ success: true, settings });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as SiteSettingsData | null;
  if (!body) return NextResponse.json({ success: false, errorMessage: "잘못된 요청입니다." }, { status: 400 });
  await updateSiteSettings(body);
  return NextResponse.json({ success: true });
}
