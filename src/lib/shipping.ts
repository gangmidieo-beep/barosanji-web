import type { Product } from "@/lib/data";

/**
 * 배송비 정책 — 상품별로 따로 계산한다.
 *
 * 기본은 무료배송이고(shippingFee = 0), 공급사가 배송비를 따로 받는 상품만
 * 그 금액을 고객에게 그대로 받는다. 배송비로 마진을 남기지 않는다.
 * freeShippingQty가 있으면 그 수량 이상 담았을 때 해당 상품 배송비는 면제된다.
 */

export type ShippingLine = {
  productId: string;
  name: string;
  fee: number;
};

/** 상품 1종의 배송비 (수량 조건 반영) */
export function getProductShippingFee(product: Product, quantity: number): number {
  const fee = product.shippingFee ?? 0;
  if (fee <= 0) return 0;
  const freeQty = product.freeShippingQty ?? 0;
  if (freeQty > 0 && quantity >= freeQty) return 0;
  return fee;
}

/** 장바구니 전체 배송비 = 유료배송 상품들의 배송비 합계 */
export function calcShipping(
  items: { product: Product; quantity: number }[]
): { total: number; lines: ShippingLine[] } {
  const lines: ShippingLine[] = [];
  let total = 0;
  for (const { product, quantity } of items) {
    const fee = getProductShippingFee(product, quantity);
    if (fee > 0) {
      lines.push({ productId: product.id, name: product.name, fee });
      total += fee;
    }
  }
  return { total, lines };
}

/** 상품 상세페이지에 보여줄 배송비 문구 */
export function shippingLabel(product: Product): string {
  const fee = product.shippingFee ?? 0;
  if (fee <= 0) return "무료배송";
  const freeQty = product.freeShippingQty ?? 0;
  if (freeQty > 0) {
    return `${fee.toLocaleString()}원 (${freeQty}개 이상 구매 시 무료)`;
  }
  return `${fee.toLocaleString()}원`;
}
