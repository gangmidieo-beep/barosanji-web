import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { siteSettings } from "@/db/schema";

export type SiteSettingsData = {
  companyName: string;
  ceoName: string;
  bizRegNo: string;
  mailOrderNo: string;
  address: string;
  csPhone: string;
  csEmail: string;
  kakaoChannelUrl: string;
};

const DEFAULTS: SiteSettingsData = {
  companyName: "(주)바로산지",
  ceoName: "홍길동",
  bizRegNo: "000-00-00000",
  mailOrderNo: "제0000-경기용인-0000호",
  address: "경기도 용인시 000로 00",
  csPhone: "1588-0000",
  csEmail: "cs@farm-mall.example",
  kakaoChannelUrl: "",
};

export async function getSiteSettings(): Promise<SiteSettingsData> {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.id, "default")).limit(1);
  if (rows.length === 0) return DEFAULTS;
  const r = rows[0];
  return {
    companyName: r.companyName,
    ceoName: r.ceoName,
    bizRegNo: r.bizRegNo,
    mailOrderNo: r.mailOrderNo,
    address: r.address,
    csPhone: r.csPhone,
    csEmail: r.csEmail,
    kakaoChannelUrl: r.kakaoChannelUrl,
  };
}

export async function updateSiteSettings(data: SiteSettingsData): Promise<void> {
  await db
    .insert(siteSettings)
    .values({ id: "default", ...data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: { ...data, updatedAt: new Date() },
    });
}
