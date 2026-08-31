import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import { db } from "@/db/client";
import { orders as ordersTable, orderItems as orderItemsTable } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { getSupplierProductCodes } from "@/lib/db-products";

/**
 * 선택한 주문들을 식품백억 "주문 대량등록 양식"에 맞춰 엑셀로 만들어 내려준다.
 * 템플릿 파일의 1~5행(안내문구/헤더/예시)은 그대로 두고, 6행부터 실제 주문 데이터를 채워 넣는다.
 *
 * 주의: 이 양식은 한 행에 수량이 무조건 1개라서, 수량 2개 이상인 상품은 줄을 나눠서 쓴다.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const orderIds: string[] = body?.orderIds ?? [];
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return NextResponse.json({ success: false, errorMessage: "선택된 주문이 없습니다." }, { status: 400 });
  }

  const [orders, items] = await Promise.all([
    db.select().from(ordersTable).where(inArray(ordersTable.id, orderIds)),
    db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds)),
  ]);

  // 옵션이 있는 상품은 productId가 "p-123::1kg" 형태라 "::" 앞부분(원래 상품 ID)만 모아서 조회
  const baseProductIds = Array.from(
    new Set(items.map((i) => i.productId?.split("::")[0]).filter((v): v is string => !!v))
  );
  const codeByProductId = await getSupplierProductCodes(baseProductIds);

  const orderById = new Map(orders.map((o) => [o.id, o]));

  const templatePath = path.join(process.cwd(), "public/templates/food100_7on62_20260831_sample.xlsx");
  const templateBuf = fs.readFileSync(templatePath);
  const wb = XLSX.read(templateBuf, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  let rowIdx = 6; // 템플릿 규칙상 6행부터 데이터 시작
  let seq = 1;
  let missingCode = false;

  for (const orderId of orderIds) {
    const order = orderById.get(orderId);
    if (!order) continue;
    const orderItems = items.filter((i) => i.orderId === orderId);
    for (const it of orderItems) {
      // 옵션이 있는 상품은 옵션마다 발주코드가 다르므로, 주문에 담긴 옵션명으로 그 옵션의 코드를 찾는다.
      // 옵션별 코드가 없으면 상품 전체에 지정된 코드를 대신 쓴다.
      const baseId = it.productId?.split("::")[0];
      const optionLabel = it.productId?.includes("::") ? it.productId.split("::")[1] : null;
      const info = baseId ? codeByProductId.get(baseId) : undefined;
      let code = "";
      if (info) {
        if (optionLabel && info.options) {
          code = info.options.find((o) => o.label === optionLabel)?.code ?? "";
        }
        if (!code) code = info.code ?? "";
      }
      if (!code) missingCode = true;
      // 이 양식은 한 행에 수량이 무조건 1개라서, 수량만큼 줄을 나눠서 쓴다.
      for (let q = 0; q < it.quantity; q++) {
        const address = `${order.receiverAddress}${order.receiverAddressDetail ? " " + order.receiverAddressDetail : ""}`;
        XLSX.utils.sheet_add_aoa(
          ws,
          [
            [
              seq,
              order.id,
              `${it.name}${it.unit ? " · " + it.unit : ""}`,
              code,
              1,
              order.receiverName,
              order.receiverPhone,
              order.receiverName,
              order.receiverPhone,
              "",
              address,
              order.deliveryMemo ?? "",
            ],
          ],
          { origin: `A${rowIdx}` }
        );
        rowIdx++;
        seq++;
      }
    }
  }

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:L6");
  range.e.r = Math.max(range.e.r, rowIdx - 1);
  ws["!ref"] = XLSX.utils.encode_range(range);

    const outBuf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

return new NextResponse(new Uint8Array(outBuf), {
    headers: { 
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="food100-bulk-order-${Date.now()}.xlsx"`,
      "X-Missing-Code": missingCode ? "1" : "0",
    },
  });
}
