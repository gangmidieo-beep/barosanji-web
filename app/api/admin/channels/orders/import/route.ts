import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { upsertChannelOrder, listChannels, type NewChannelOrder } from "@/lib/db-channels";
import { channelOrderStatusValues, type ChannelOrderStatus } from "@/db/schema";
import { KST_OFFSET } from "@/lib/channel-profit";

export const dynamic = "force-dynamic";

/** 엑셀 업로드 템플릿 컬럼 (헤더명 그대로 사용) */
const IMPORT_COLUMNS = [
  "채널", "주문번호", "주문일시", "상태", "구매자", "수령인", "연락처", "주소", "배송메모",
  "상품명", "옵션", "수량", "판매가", "배송비", "바로산지상품ID",
] as const;

/** GET → 빈 템플릿 xlsx 다운로드 */
export async function GET() {
  const channels = await listChannels();
  const wb = XLSX.utils.book_new();
  const sample = [
    Object.fromEntries(IMPORT_COLUMNS.map((c) => [c, ""])),
  ];
  sample[0]["채널"] = "coupang";
  sample[0]["주문번호"] = "예) 12345678901";
  sample[0]["주문일시"] = "2026-09-07 14:30";
  sample[0]["상태"] = "신규";
  sample[0]["상품명"] = "예) 사과 5kg";
  sample[0]["수량"] = "1";
  sample[0]["판매가"] = "29900";
  sample[0]["배송비"] = "0";
  const ws = XLSX.utils.json_to_sheet(sample, { header: [...IMPORT_COLUMNS] });
  XLSX.utils.book_append_sheet(wb, ws, "주문");
  const guide = XLSX.utils.aoa_to_sheet([
    ["채널 ID", "채널명"],
    ...channels.map((c) => [c.id, c.name]),
    [],
    ["상태값", channelOrderStatusValues.join(", ")],
    ["안내", "같은 주문번호가 여러 줄이면 상품 여러 개인 한 주문으로 묶입니다. 배송비는 첫 줄만 적으면 됩니다."],
    ["안내", "바로산지상품ID를 적으면 원가·카테고리가 자동 연결됩니다 (상품관리에서 확인)."],
  ]);
  XLSX.utils.book_append_sheet(wb, guide, "안내");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="channel-orders-template.xlsx"`,
    },
  });
}

function parseDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === "number") {
    // 엑셀 시리얼 → KST 로컬 시각으로 해석
    const p = XLSX.SSF.parse_date_code(v);
    if (!p) return null;
    return new Date(Date.UTC(p.y, p.m - 1, p.d, p.H, p.M, p.S) - KST_OFFSET);
  }
  const s = String(v ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)) - KST_OFFSET);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const num = (v: unknown) => Math.round(Number(String(v ?? "").replace(/[^\d.-]/g, "")) || 0);

/** POST multipart/form-data { file } → 주문 저장 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ success: false, errorMessage: "파일을 선택해주세요." }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  const channelIds = new Set((await listChannels()).map((c) => c.id));
  const nameToId = new Map((await listChannels()).map((c) => [c.name, c.id]));
  const grouped = new Map<string, NewChannelOrder>();
  const errors: string[] = [];

  rows.forEach((r, i) => {
    const line = i + 2;
    const chRaw = String(r["채널"] ?? "").trim();
    const channelId = channelIds.has(chRaw) ? chRaw : nameToId.get(chRaw);
    const externalOrderId = String(r["주문번호"] ?? "").trim();
    const name = String(r["상품명"] ?? "").trim();
    if (!channelId) { errors.push(`${line}행: 채널 "${chRaw}" 없음`); return; }
    if (!externalOrderId || externalOrderId.startsWith("예)")) { errors.push(`${line}행: 주문번호 없음`); return; }
    if (!name || name.startsWith("예)")) { errors.push(`${line}행: 상품명 없음`); return; }
    const key = `${channelId}:${externalOrderId}`;
    let o = grouped.get(key);
    if (!o) {
      const orderedAt = parseDate(r["주문일시"]) ?? new Date();
      const st = String(r["상태"] ?? "").trim() as ChannelOrderStatus;
      o = {
        channelId,
        externalOrderId,
        orderedAt,
        status: channelOrderStatusValues.includes(st) ? st : "신규",
        buyerName: String(r["구매자"] ?? ""),
        receiverName: String(r["수령인"] ?? ""),
        receiverPhone: String(r["연락처"] ?? ""),
        receiverAddress: String(r["주소"] ?? ""),
        deliveryMemo: String(r["배송메모"] ?? ""),
        shippingFee: num(r["배송비"]),
        source: "excel",
        items: [],
      };
      grouped.set(key, o);
    } else if (num(r["배송비"]) > 0 && !o.shippingFee) {
      o.shippingFee = num(r["배송비"]);
    }
    o.items.push({
      productId: String(r["바로산지상품ID"] ?? "").trim() || null,
      name,
      option: String(r["옵션"] ?? ""),
      quantity: Math.max(1, num(r["수량"]) || 1),
      unitPrice: num(r["판매가"]),
    });
  });

  let saved = 0;
  for (const o of grouped.values()) {
    await upsertChannelOrder(o);
    saved++;
  }
  return NextResponse.json({ success: true, saved, skipped: errors.length, errors: errors.slice(0, 20) });
}
