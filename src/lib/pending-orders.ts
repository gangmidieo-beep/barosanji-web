/**
 * 결제창으로 넘어가기 전 주문 상세정보를 잠깐 보관해두는 임시 저장소.
 *
 * PayApp 결제 요청(POST /api/payapp/request) 시점에는 배송지/상품 목록을 알지만,
 * 실제 결제 완료 통보는 별도의 서버-투-서버 웹훅(POST /api/payapp/feedback)으로
 * 나중에 온다. 그 웹훅에서 "무엇을 어디로 보낼지"를 알아야 어드민플러스로 발주를
 * 올릴 수 있으므로, orderId를 키로 잠깐 들고 있다가 결제완료 시점에 꺼내 쓴다.
 *
 * ⚠️ 지금은 실제 DB가 없는 데모 단계라 서버 메모리(in-memory Map)에 저장합니다.
 *    서버가 재시작되거나 인스턴스가 여러 개면(Railway에서 replica가 2개 이상이면)
 *    유실될 수 있으므로, 실제 서비스 전환 시에는 반드시 DB(주문 테이블)로 옮겨야 합니다.
 */

export type PendingOrderItem = {
  name: string;
  quantity: number;
  price: number;
  /** 이 상품을 발주할 업체 ID (src/lib/suppliers.ts 의 Supplier.id) */
  supplierId: string;
};

export type PendingOrder = {
  orderId: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverAddressDetail?: string;
  deliveryMemo?: string;
  items: PendingOrderItem[];
  amount: number;
  createdAt: number;
};

const store = new Map<string, PendingOrder>();

// 24시간 지난 항목은 자동 정리 (결제를 안 하고 이탈한 케이스 대비)
const TTL_MS = 24 * 60 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  for (const [id, order] of store.entries()) {
    if (now - order.createdAt > TTL_MS) store.delete(id);
  }
}

export function savePendingOrder(order: PendingOrder) {
  cleanup();
  store.set(order.orderId, order);
}

export function getPendingOrder(orderId: string): PendingOrder | undefined {
  return store.get(orderId);
}

export function deletePendingOrder(orderId: string) {
  store.delete(orderId);
}
