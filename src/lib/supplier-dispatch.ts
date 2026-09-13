/**
 * 결제 완료된 주문을 공급사(어드민플러스)에 발주로 올리는 공통 로직.
 *
 * 예전에는 결제수단별 웹훅(payapp/feedback, paymap/noti)이 각자 발주 코드를 따로 갖고 있었고,
 * 그 둘이 갈라져 있었다 — 페이맵 쪽만 발주코드/옵션코드를 쓰고, 실제로 쓰이는 페이앱 쪽은
 * 상품명(product_string)으로만 발주를 넣고 있었다. 상품명이 공급사 쪽과 다르면 매칭이
 * 안 되거나 임시상품으로 잡히는 문제가 있어서, 두 경로가 같은 코드를 쓰도록 여기로 합쳤다.
 *
 * 발주 아이템 매칭 우선순위:
 *   1) 옵션코드(ProductOption.code) — 옵션 상품일 때
 *   2) 상품 발주코드(products.supplierProductCode)
 *   3) 상품명(product_string) — 공급사 쪽 자동(임시) 매칭. 최후의 수단.
 */

import { isAdminPlusConfigured, pushOrderToAdminPlus, type AdminPlusOrderItem } from "./adminplus";
import { getAdminProductById } from "./db-products";
import { getSupplierByIdFromDb } from "./db-suppliers";
import { saveSupplierOrderResult, type OrderWithItems } from "./db-orders";
import type { SupplierOrderStatus } from "@/db/schema";

export type SupplierDispatchResult = {
  supplierId: string;
  supplierName?: string;
  success: boolean;
  /** 발주 아이템을 상품명으로만 매칭한 건 (공급사에서 임시상품으로 잡힐 수 있음) */
  unmatchedItemNames: string[];
  adminPlusOrderId?: string;
  totalAmount?: number;
  errorMessage?: string;
  skipped?: "unknown-supplier" | "not-configured" | "ordering-disabled";
};

/** 주문상품 하나를 어드민플러스 발주 아이템으로 바꾼다. 코드 매칭에 실패하면 상품명으로 넘긴다. */
async function toAdminItem(
  item: OrderWithItems["items"][number],
  productCache: Map<string, Awaited<ReturnType<typeof getAdminProductById>>>
): Promise<{ adminItem: AdminPlusOrderItem; matchedByName: boolean }> {
  // 주문상품의 productId는 `${상품ID}::${옵션라벨}` 형태일 수 있다.
  const baseId = item.productId?.split("::")[0];
  if (baseId && !productCache.has(baseId)) {
    productCache.set(baseId, await getAdminProductById(baseId));
  }
  const product = baseId ? productCache.get(baseId) : undefined;

  const optionCode = product?.options?.find((o) => o.label === item.unit)?.code;
  if (optionCode) {
    return { adminItem: { option_code: optionCode, quantity: item.quantity }, matchedByName: false };
  }

  const productCode = product?.supplierProductCode;
  if (productCode) {
    return { adminItem: { product_code: productCode, quantity: item.quantity }, matchedByName: false };
  }

  return { adminItem: { product_string: item.name, quantity: item.quantity }, matchedByName: true };
}

/**
 * 주문을 공급사별로 묶어 어드민플러스에 발주 등록한다.
 * 발주 실패는 결제 자체와 무관하므로 예외를 던지지 않고 결과 배열로만 돌려준다 —
 * 호출하는 웹훅은 결제 통지에 반드시 성공 응답을 해야 하기 때문.
 */
export async function dispatchOrderToSuppliers(
  order: OrderWithItems
): Promise<SupplierDispatchResult[]> {
  const bySupplier = new Map<string, OrderWithItems["items"]>();
  for (const item of order.items) {
    const key = item.supplierId || "unknown";
    if (!bySupplier.has(key)) bySupplier.set(key, []);
    bySupplier.get(key)!.push(item);
  }

  const productCache = new Map<string, Awaited<ReturnType<typeof getAdminProductById>>>();
  const results: SupplierDispatchResult[] = [];

  for (const [supplierId, items] of bySupplier) {
    const supplier = await getSupplierByIdFromDb(supplierId);
    if (!supplier) {
      console.error("[adminplus] 알 수 없는 supplierId — 발주 스킵", { orderId: order.id, supplierId });
      results.push({ supplierId, success: false, unmatchedItemNames: [], skipped: "unknown-supplier" });
      continue;
    }
    if (!supplier.orderingEnabled) {
      // 발주 중지된 업체. 여기까지 주문이 들어왔다는 건 결제 단계 차단이 뚫렸다는 뜻이라 에러로 남긴다.
      console.error("[adminplus] 발주 중지된 업체의 주문 — 수동 처리 필요", {
        orderId: order.id,
        supplier: supplier.name,
      });
      results.push({
        supplierId,
        supplierName: supplier.name,
        success: false,
        unmatchedItemNames: [],
        skipped: "ordering-disabled",
        errorMessage: `${supplier.name}은(는) 현재 발주 중지 상태입니다 — 수동으로 발주해주세요.`,
      });
      continue;
    }
    if (!isAdminPlusConfigured(supplier.envKey)) {
      // 예전에는 console.log였다 — 조용히 넘어가서 "결제는 됐는데 발주가 없다"를 아무도 몰랐다.
      // 대부분 DB의 env_key와 Railway 환경변수 이름이 어긋나서 생긴다.
      console.error("[adminplus] 자격증명을 찾을 수 없음 — 발주 안 나감", {
        orderId: order.id,
        supplier: supplier.name,
        envKey: supplier.envKey,
        기대하는_환경변수: `ADMINPLUS_CLIENT_ID_${supplier.envKey} / ADMINPLUS_CLIENT_SECRET_${supplier.envKey}`,
      });
      results.push({
        supplierId,
        supplierName: supplier.name,
        success: false,
        unmatchedItemNames: [],
        skipped: "not-configured",
        errorMessage:
          `${supplier.name}의 어드민플러스 자격증명이 없습니다 ` +
          `(찾은 이름: ADMINPLUS_CLIENT_ID_${supplier.envKey}). 거래처 env_key와 환경변수 이름이 맞는지 확인해주세요.`,
      });
      continue;
    }

    const adminItems: AdminPlusOrderItem[] = [];
    const unmatchedItemNames: string[] = [];
    for (const item of items) {
      const { adminItem, matchedByName } = await toAdminItem(item, productCache);
      adminItems.push(adminItem);
      if (matchedByName) unmatchedItemNames.push(item.name);
    }

    if (unmatchedItemNames.length > 0) {
      // 발주는 계속 진행하되, 코드 없이 나간 건은 눈에 띄게 남긴다.
      console.warn("[adminplus] 발주코드 없이 상품명으로 발주함 — 공급사 매칭 확인 필요", {
        orderId: order.id,
        supplier: supplier.name,
        items: unmatchedItemNames,
      });
    }

    const pushed = await pushOrderToAdminPlus(supplier.envKey, {
      customerOrderCode: `${order.id}-${supplierId}`,
      receiverName: order.receiverName,
      receiverPhone: order.receiverPhone,
      receiverAddress: order.receiverAddress,
      receiverAddressDetail: order.receiverAddressDetail ?? undefined,
      deliveryMemo: order.deliveryMemo ?? undefined,
      items: adminItems,
    });

    if (pushed.success) {
      console.log("[adminplus push ok]", {
        orderId: order.id,
        supplier: supplier.name,
        adminPlusOrderId: pushed.adminPlusOrderId,
        totalAmount: pushed.totalAmount,
      });
    } else {
      console.error("[adminplus push failed]", {
        orderId: order.id,
        supplier: supplier.name,
        error: pushed.errorMessage,
      });
    }

    results.push({
      supplierId,
      supplierName: supplier.name,
      success: pushed.success,
      unmatchedItemNames,
      adminPlusOrderId: pushed.adminPlusOrderId,
      totalAmount: pushed.totalAmount,
      errorMessage: pushed.errorMessage,
    });
  }

  await recordDispatchResults(order.id, results);
  return results;
}

/** 발주 결과를 한 줄 요약으로 만들어 주문에 저장한다. 관리자 주문 화면에서 이걸 보고 재발주를 판단한다. */
async function recordDispatchResults(
  orderId: string,
  results: SupplierDispatchResult[]
): Promise<void> {
  if (results.length === 0) return;

  const succeeded = results.filter((r) => r.success);
  const status: SupplierOrderStatus =
    succeeded.length === results.length ? "성공" : succeeded.length === 0 ? "실패" : "일부실패";

  const note = results
    .map((r) => {
      const who = r.supplierName ?? r.supplierId;
      if (r.success) {
        const warn =
          r.unmatchedItemNames.length > 0
            ? ` (발주코드 없이 상품명으로 보냄: ${r.unmatchedItemNames.join(", ")})`
            : "";
        return `${who}: 성공${r.adminPlusOrderId ? ` #${r.adminPlusOrderId}` : ""}${warn}`;
      }
      return `${who}: 실패 — ${r.errorMessage ?? "사유 미상"}`;
    })
    .join(" / ");

  try {
    await saveSupplierOrderResult(orderId, status, note);
  } catch (err) {
    // 기록 실패가 발주 자체를 되돌리지는 않으므로 로그만 남긴다.
    console.error("[adminplus] 발주 결과 기록 실패", { orderId, error: (err as Error).message });
  }
}
