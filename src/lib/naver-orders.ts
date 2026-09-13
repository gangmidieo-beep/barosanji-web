/**
 * 스마트스토어 주문 자동수집 → 공급사 자동발주.
 *
 * 흐름:
 *   1. 커머스API로 결제완료된 상품주문을 기간으로 조회
 *   2. 매칭표(channel_product_mappings)로 "이 주문이 바로산지의 어느 상품인지" 찾는다
 *   3. 채널주문으로 저장 (같은 상품주문번호는 덮어쓰므로 중복 수집돼도 안전)
 *   4. 새로 들어온 건만 공급사(어드민플러스)로 발주
 *
 * 매칭 우선순위: 옵션 관리코드 → (상품번호 + 옵션명) → 상품번호
 * 매칭이 안 되면 발주하지 않고 "매칭 필요"로 남긴다 — 엉뚱한 상품을 발주하는 것보다 낫다.
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { channelProductMappings, channelOrders, channels } from "@/db/schema";
import { listProductOrders, type NaverProductOrder } from "./naver-commerce";
import { upsertChannelOrder } from "./db-channels";
import { getAdminProductById } from "./db-products";
import { dispatchOrderToSuppliers, summarizeDispatch } from "./supplier-dispatch";

export const SMARTSTORE_CHANNEL_ID = "smartstore";

/** 발주까지 보내도 되는 주문 상태 — 결제완료/발주대기만 */
const DISPATCHABLE_STATUSES = ["PAYED", "PAYMENT_WAITING", "DELIVERING", ""];

export type CollectResult = {
  조회건수: number;
  신규저장: number;
  이미있음: number;
  발주성공: number;
  발주실패: number;
  매칭필요: number;
  상세: {
    productOrderId: string;
    상품명: string;
    옵션: string;
    상태: "발주완료" | "발주실패" | "매칭필요" | "이미처리됨" | "발주대상아님";
    메모: string;
  }[];
};

type Mapping = typeof channelProductMappings.$inferSelect;

/** 주문 한 건에 맞는 매칭을 찾는다 */
function findMapping(order: NaverProductOrder, mappings: Mapping[]): Mapping | undefined {
  const code = order.optionManageCode.trim();
  if (code) {
    const byCode = mappings.find((m) => m.externalOptionCode && m.externalOptionCode.trim() === code);
    if (byCode) return byCode;
  }
  const pid = order.externalProductId.trim();
  if (!pid) return undefined;
  const sameProduct = mappings.filter((m) => m.externalProductId.trim() === pid);
  if (sameProduct.length === 0) return undefined;
  // 옵션명까지 맞는 게 있으면 그걸 쓴다
  const opt = order.optionName.trim();
  if (opt) {
    const byOption = sameProduct.find((m) => m.externalOptionName.trim() === opt);
    if (byOption) return byOption;
  }
  // 옵션 구분이 없는 매칭(단일 상품)만 남았을 때만 쓴다 — 여러 개면 애매하므로 포기
  const noOption = sameProduct.filter((m) => !m.externalOptionName.trim());
  return noOption.length === 1 ? noOption[0] : undefined;
}

export async function collectSmartstoreOrders(opts: {
  from: Date;
  to: Date;
  /** true면 저장만 하고 발주는 보내지 않는다 */
  dryRun?: boolean;
  /** 주문 조회 방법을 바꿔 끼울 수 있게 열어둔다 (테스트에서 씀). 기본은 커머스API 호출 */
  fetchOrders?: (range: { from: Date; to: Date }) => Promise<NaverProductOrder[]>;
}): Promise<CollectResult> {
  const fetchOrders = opts.fetchOrders ?? listProductOrders;
  const orders = await fetchOrders({ from: opts.from, to: opts.to });
  const mappings = await db
    .select()
    .from(channelProductMappings)
    .where(eq(channelProductMappings.channelId, SMARTSTORE_CHANNEL_ID));

  const result: CollectResult = {
    조회건수: orders.length,
    신규저장: 0,
    이미있음: 0,
    발주성공: 0,
    발주실패: 0,
    매칭필요: 0,
    상세: [],
  };
  if (orders.length === 0) return result;

  // 이미 저장된 주문인지 먼저 확인 (중복 발주 방지)
  const ids = orders.map((o) => `${SMARTSTORE_CHANNEL_ID}:${o.productOrderId}`);
  const existingRows = await db
    .select({ id: channelOrders.id, note: channelOrders.supplierOrderNote })
    .from(channelOrders)
    .where(inArray(channelOrders.id, ids));
  const existing = new Map(existingRows.map((r) => [r.id, r.note]));

  for (const o of orders) {
    const rowId = `${SMARTSTORE_CHANNEL_ID}:${o.productOrderId}`;
    const push = (상태: CollectResult["상세"][number]["상태"], 메모: string) =>
      result.상세.push({ productOrderId: o.productOrderId, 상품명: o.productName, 옵션: o.optionName, 상태, 메모 });

    const mapping = findMapping(o, mappings);
    const product = mapping ? await getAdminProductById(mapping.productId) : undefined;

    // 저장은 매칭 여부와 상관없이 한다 — 매출 집계는 되어야 하므로
    await upsertChannelOrder({
      channelId: SMARTSTORE_CHANNEL_ID,
      externalOrderId: o.productOrderId,
      orderedAt: o.orderedAt ? new Date(o.orderedAt) : new Date(),
      status: "신규",
      receiverName: o.receiverName,
      receiverPhone: o.receiverPhone,
      receiverAddress: o.receiverAddress,
      deliveryMemo: o.deliveryMemo,
      source: "api",
      raw: o.raw,
      items: [
        {
          productId: mapping ? mapping.productId : null,
          name: o.productName || "(상품명 없음)",
          option: o.optionName,
          quantity: o.quantity,
          unitPrice: o.quantity > 0 ? Math.round(o.totalPaymentAmount / o.quantity) : o.totalPaymentAmount,
          supplierId: product?.supplierId ?? null,
        },
      ],
    });

    const wasExisting = existing.has(rowId);
    if (wasExisting) result.이미있음 += 1;
    else result.신규저장 += 1;

    // 이미 발주가 성공했던 건은 다시 보내지 않는다
    if (wasExisting && (existing.get(rowId) ?? "").includes("성공")) {
      push("이미처리됨", "이전 수집에서 발주 완료");
      continue;
    }
    if (!DISPATCHABLE_STATUSES.includes(o.productOrderStatus)) {
      push("발주대상아님", `주문상태 ${o.productOrderStatus}`);
      continue;
    }
    if (!mapping || !product) {
      result.매칭필요 += 1;
      push(
        "매칭필요",
        `스마트스토어 상품번호 ${o.externalProductId || "(없음)"} / 옵션 "${o.optionName}" 에 맞는 바로산지 상품이 매칭표에 없습니다`
      );
      continue;
    }
    if (opts.dryRun) {
      push("매칭필요", `[시뮬레이션] ${product.name} 으로 발주 예정`);
      continue;
    }

    // 발주 — 채널주문이므로 orders 테이블에는 기록하지 않는다
    const results = await dispatchOrderToSuppliers(
      {
        id: rowId,
        receiverName: o.receiverName,
        receiverPhone: o.receiverPhone,
        receiverAddress: o.receiverAddress,
        deliveryMemo: o.deliveryMemo,
        items: [
          {
            productId: mapping.optionLabel ? `${mapping.productId}::${mapping.optionLabel}` : mapping.productId,
            name: product.name,
            unit: mapping.optionLabel,
            quantity: o.quantity,
            supplierId: product.supplierId,
          },
        ],
      },
      { recordToOrder: false }
    );

    const { status, note } = summarizeDispatch(results);
    await db
      .update(channelOrders)
      .set({ supplierOrderNote: note, status: status === "성공" ? "발주완료" : "신규" })
      .where(eq(channelOrders.id, rowId));

    if (status === "성공") {
      result.발주성공 += 1;
      push("발주완료", note);
    } else {
      result.발주실패 += 1;
      push("발주실패", note);
    }
  }

  // 다음 수집의 시작점 기록
  await db
    .update(channels)
    .set({ lastOrderSyncAt: opts.to })
    .where(eq(channels.id, SMARTSTORE_CHANNEL_ID));

  return result;
}

/** 다음 수집 구간을 정한다 — 마지막 수집 지점부터, 없으면 최근 N시간 */
export async function nextSyncWindow(defaultHours = 6): Promise<{ from: Date; to: Date }> {
  const [ch] = await db
    .select({ last: channels.lastOrderSyncAt })
    .from(channels)
    .where(and(eq(channels.id, SMARTSTORE_CHANNEL_ID)))
    .limit(1);
  const to = new Date();
  const fallback = new Date(to.getTime() - defaultHours * 3600_000);
  // 겹치게 조회해도 중복 저장이 안 되므로, 놓치는 것보다 겹치는 편이 안전하다
  const from = ch?.last ? new Date(ch.last.getTime() - 30 * 60_000) : fallback;
  // 조회 범위가 너무 길면 API가 거부할 수 있어 최대 24시간으로 자른다
  const maxFrom = new Date(to.getTime() - 24 * 3600_000);
  return { from: from < maxFrom ? maxFrom : from, to };
}
