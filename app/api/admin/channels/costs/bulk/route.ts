import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { bulkAdjustCosts } from "@/lib/db-pricing";
import { addCost } from "@/lib/db-channels";
import { kstDateStart } from "@/lib/channel-period";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** GET — 원가 일괄 등록용 엑셀 템플릿 (공급업체 주간 단가표를 옮겨 적는 용도) */
export async function GET() {
  const rows = await db.select({ id: products.id, name: products.name, unit: products.unit }).from(products).orderBy(asc(products.name));
  const wb = XLSX.utils.book_new();
  const sheet = rows.map((p) => ({ 상품ID: p.id, 상품명: p.name, 규격: p.unit, 매입가: "", 택배비: "", 포장비: "", 적용시작일: "", 메모: "" }));
  if (!sheet.length) sheet.push({ 상품ID: "", 상품명: "", 규격: "", 매입가: "", 택배비: "", 포장비: "", 적용시작일: "", 메모: "" });
  const ws = XLSX.utils.json_to_sheet(sheet, { header: ["상품ID", "상품명", "규격", "매입가", "택배비", "포장비", "적용시작일", "메모"] });
  XLSX.utils.book_append_sheet(wb, ws, "원가");
  const guide = XLSX.utils.aoa_to_sheet([
    ["안내", "매입가만 채워도 됩니다. 택배비·포장비를 비우면 기존 값이 아니라 0으로 저장되니, 바꾸지 않을 값도 적어주세요."],
    ["적용시작일", "비우면 오늘부터 적용. YYYY-MM-DD 형식 (예: 2026-11-01). 미래 날짜를 넣으면 그날부터 자동 적용됩니다."],
    ["활용", "겨울 시세처럼 단가가 오를 때 공급업체 단가표를 이 양식에 옮겨 한 번에 반영하세요."],
  ]);
  XLSX.utils.book_append_sheet(wb, guide, "안내");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="product-costs-template.xlsx"',
    },
  });
}

const num = (v: unknown) => Math.round(Number(String(v ?? "").replace(/[^\d.-]/g, "")) || 0);

/** POST multipart(file) — 엑셀 일괄 등록 / 또는 JSON { productIds, ratePct, effectiveFrom, note } — 퍼센트 일괄 조정 */
export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return NextResponse.json({ success: false, errorMessage: "파일을 선택해주세요." }, { status: 400 });
    const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    let saved = 0;
    const errors: string[] = [];
    for (const [i, r] of rows.entries()) {
      const productId = String(r["상품ID"] ?? "").trim();
      const costPrice = num(r["매입가"]);
      if (!productId) continue;
      if (costPrice <= 0) { errors.push(`${i + 2}행 ${productId}: 매입가 없음`); continue; }
      const dateStr = String(r["적용시작일"] ?? "").trim();
      await addCost({
        productId,
        costPrice,
        shippingCost: num(r["택배비"]),
        packagingCost: num(r["포장비"]),
        effectiveFrom: dateStr ? kstDateStart(dateStr) : new Date(),
        note: String(r["메모"] ?? ""),
      });
      saved++;
    }
    return NextResponse.json({ success: true, saved, skipped: errors.length, errors: errors.slice(0, 20) });
  }

  const b = await req.json().catch(() => null);
  const productIds = Array.isArray(b?.productIds) ? b.productIds.map(String) : [];
  const ratePct = Number(b?.ratePct);
  if (!productIds.length) return NextResponse.json({ success: false, errorMessage: "상품을 선택해주세요." }, { status: 400 });
  if (!Number.isFinite(ratePct) || ratePct === 0) return NextResponse.json({ success: false, errorMessage: "조정 비율을 입력해주세요. (예: 15 또는 -10)" }, { status: 400 });
  if (Math.abs(ratePct) > 200) return NextResponse.json({ success: false, errorMessage: "조정 비율은 ±200% 이내로 입력해주세요." }, { status: 400 });
  const updated = await bulkAdjustCosts({
    productIds,
    rate: ratePct / 100,
    effectiveFrom: b?.effectiveFrom ? kstDateStart(String(b.effectiveFrom)) : new Date(),
    note: String(b?.note ?? `일괄 ${ratePct > 0 ? "+" : ""}${ratePct}% 조정`),
  });
  return NextResponse.json({ success: true, updated });
}
