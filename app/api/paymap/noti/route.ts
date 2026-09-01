import { NextRequest, NextResponse } from "next/server";
import { verifyPayMapNoti, isCancelNoti } from "@/lib/paymap";
import { getOrderWithItems, updateOrderPayResult, type OrderWithItems } from "@/lib/db-orders";
import { pushOrderToAdminPlus, isAdminPlusConfigured } from "@/lib/adminplus";
import { getSupplierByIdFromDb } from "@/lib/db-suppliers";
import { getAdminProductById } from "@/lib/db-products";

/**
 * 페이맵 결제통지(Noti) 수신 — 실제 결제 확정은 여기서만 처리한다.
 * 규격상 성공하면 200 + {} 를, 실패하면 200 이외 코드 + {"message":"사유"} 를 반환해야 하며
 * 포맷이 다르면 페이맵이 1분 간격으로 재전송한다.
 */
export async function POST(req: NextRequest) {
  let data: Record<string, string> = {};
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      data = await req.json();
    } else {
      const form = await req.formData();
      form.forEach((value, key) => {
        data[key] = String(value);
      });
    }
  } catch {
    return NextResponse.json({ message: "본문을 읽을 수 없습니다." }, { status: 400 });
  }

  console.log("[paymap noti]", {
    ordNum: data.ord_num,
    trxId: data.trx_id,
    amount: data.amount,
    isCancel: data.is_cancel,
    moduleType: data.module_type,
  });

  if (!verifyPayMapNoti(data)) {
    return NextResponse.json({ message: "서명 검증 실패" }, { status: 401 });
  }

  const orderId = String(data.ord_num ?? "");
  if (!orderId) {
    return NextResponse.json({ message: "주문번호가 없습니다." }, { status: 400 });
  }

  const canceled = isCancelNoti(data);

  try {
    await updateOrderPayResult(
      orderId,
      canceled ? "결제취소" : "결제완료",
      `paymap:${canceled ? "cancel" : "approve"}:${data.trx_id ?? ""}`
    );
  } catch (e) {
    console.error("[paymap noti] 주문 상태 반영 실패", e);
    return NextResponse.json({ message: "주문 상태 반영 실패" }, { status: 500 });
  }

   // 결제 완료건만 공급업체로 발주를 올린다 (취소건은 발주 안 함)
  if (!canceled) {
    try {
      const pending: OrderWithItems | undefined = await getOrderWithItems(orderId);
      if (pending) {
        // 주문에 담긴 상품들의 발주코드(supplierProductCode / 옵션 code)를 한 번에 조회
        const baseIds = Array.from(
          new Set(
            pending.items
              .map((it) => it.productId?.split("::")[0])
              .filter((id): id is string => !!id)
          )
        );
        const productById = new Map<string, Awaited<ReturnType<typeof getAdminProductById>>>();
        for (const bid of baseIds) {
          productById.set(bid, await getAdminProductById(bid));
        }

        // 주문상품 → 어드민플러스 발주 아이템 (발주코드 우선, 없으면 상품명으로 자동매칭)
        const toAdminItem = (it: OrderWithItems["items"][number]) => {
          const baseId = it.productId?.split("::")[0];
          const product = baseId ? productById.get(baseId) : undefined;
          let code: string | undefined;
          if (product) {
            const opt = product.options?.find((o) => o.label === it.unit);
            code = (opt?.code || product.supplierProductCode) ?? undefined;
          }
          return code
            ? { product_code: code, quantity: it.quantity }
            : { product_string: it.name, quantity: it.quantity };
        };

        const bySupplier = new Map<string, OrderWithItems["items"]>();
        for (const item of pending.items) {
          const key = item.supplierId || "unknown";
          if (!bySupplier.has(key)) bySupplier.set(key, []);
          bySupplier.get(key)!.push(item);
        }

        for (const [supplierId, items] of bySupplier.entries()) {
          const supplier = await getSupplierByIdFromDb(supplierId);
          if (!supplier || !isAdminPlusConfigured(supplier.envKey)) {
            console.log("[adminplus] 발주 스킵", { orderId, supplierId });
            continue;
          }
          const result = await pushOrderToAdminPlus(supplier.envKey, {
            customerOrderCode: `${pending.id}-${supplierId}`,
            receiverName: pending.receiverName,
            receiverPhone: pending.receiverPhone,
            receiverAddress: pending.receiverAddress,
            receiverAddressDetail: pending.receiverAddressDetail ?? undefined,
            deliveryMemo: pending.deliveryMemo ?? undefined,
            items: items.map(toAdminItem),
          });
          if (result.success) {
            console.log("[adminplus] 발주 등록 성공", {
              orderId,
              supplier: supplier.name,
              orderKey: result.adminPlusOrderId,
              totalAmount: result.totalAmount,
            });
          } else {
            console.error("[adminplus push failed]", { orderId, supplier: supplier.name, error: result.errorMessage });
          }
        }
      }
    } catch (e) {
      // 발주 실패는 결제 자체와 무관하므로, 통지는 성공으로 응답하고 로그만 남긴다.
      console.error("[paymap noti] 발주 처리 중 오류", e);
    }
  }
