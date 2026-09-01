/**
 * 어드민플러스(AdminPlus) Open API 연동 헬퍼 — 실제 문서(https://api.adminplus.co.kr/docs/seller.html) 기준.
 *
 * 흐름: 고객이 바로산지에서 결제(페이맵)를 완료하면, 그 주문을 공급사(팡이네 등)의
 * 어드민플러스 계정에 "주문 등록"만 올린다. 그러면 공급사 쪽 "결제 대기"에 상품/옵션/
 * 입금할 금액(total_amount)이 뜨고, 대표님이 확인 후 무통장 입금(결제 접수)을 직접 처리한다.
 * → 우리는 결제(결제 접수)를 자동으로 하지 않는다. (예전 submitAdminPlusPayment 자동호출 제거)
 *
 * 인증: OAuth2 Client Credentials. POST /oauth/token (application/x-www-form-urlencoded)
 *   본문: client_id, client_secret  →  응답: { data: { access_token, expires_in, token_type } }
 * 주문등록: POST /v1/seller/orders (application/json, Bearer 토큰, 권한 order.write)
 *
 * 업체별로 client_id/secret이 다르므로 모든 함수는 envKey(src/lib/suppliers.ts)를 첫 인자로 받는다.
 * client_id/secret은 반드시 환경변수(ADMINPLUS_CLIENT_ID_<envKey> / ADMINPLUS_CLIENT_SECRET_<envKey>)로만 관리.
 */

import { getSupplierCredentials, isSupplierConfigured } from "./suppliers";

const DEFAULT_BASE_URL = "https://api.adminplus.co.kr";

function apiBase(): string {
  return process.env.ADMINPLUS_API_BASE || DEFAULT_BASE_URL;
}

/** 특정 업체(envKey)의 자격증명이 설정되어 있는지 */
export function isAdminPlusConfigured(envKey: string): boolean {
  return isSupplierConfigured(envKey);
}

type AdminPlusEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

/**
 * 패널이 Client ID를 URL 인코딩된 형태(예: ...%3D%3D)로 보여줄 수 있다.
 * 실제 값으로 정규화해두면, form 전송 시 URLSearchParams가 다시 정확히 인코딩한다.
 * (저장값이 이미 디코딩된 상태면 그대로 둔다)
 */
function normalizeCred(v: string): string {
  try {
    if (/%[0-9A-Fa-f]{2}/.test(v)) return decodeURIComponent(v);
  } catch {
    /* 디코딩 실패 시 원본 사용 */
  }
  return v;
}

// ---------------------------------------------------------------------------
// 1) 토큰 발급 (POST /oauth/token, x-www-form-urlencoded)
//    토큰 유효기간이 길어(초 단위 expires_in) 만료 전까지 업체별로 캐시/재사용한다.
// ---------------------------------------------------------------------------

type TokenCache = {
  accessToken: string;
  obtainedAt: number; // epoch ms
  expiresInSec: number;
};

const tokenCacheBySupplier = new Map<string, TokenCache>();
const TOKEN_REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000; // 만료 1일 전 미리 갱신

async function requestToken(
  clientId: string,
  clientSecret: string
): Promise<{ ok: boolean; status: number; token?: string; expiresIn?: number; message?: string }> {
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret });
  const res = await fetch(`${apiBase()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  let json: {
    message?: string;
    data?: { access_token?: string; expires_in?: number };
    access_token?: string;
    expires_in?: number;
  } | null = null;
  try {
    json = await res.json();
  } catch {
    /* JSON 아님 */
  }
  if (!res.ok) return { ok: false, status: res.status, message: json?.message };
  const token = json?.data?.access_token ?? json?.access_token;
  const expiresIn = json?.data?.expires_in ?? json?.expires_in ?? 30 * 24 * 60 * 60;
  return { ok: !!token, status: res.status, token, expiresIn, message: json?.message };
}

async function fetchNewToken(envKey: string): Promise<TokenCache> {
  const creds = getSupplierCredentials(envKey);
  if (!creds) {
    throw new Error(`업체(${envKey})의 ADMINPLUS_CLIENT_ID/SECRET이 설정되어 있지 않습니다.`);
  }

  // 자격증명이 %2B(+)·%3D(=)처럼 URL 인코딩돼 저장될 수 있어, 디코딩한 값과 원본 그대로를
  // 모두 시도한다. (업체마다 인코딩 표기가 달라 하나만 쓰면 특정 업체가 401 나는 문제 방지)
  const ids = Array.from(new Set([normalizeCred(creds.clientId), creds.clientId]));
  const secrets = Array.from(new Set([normalizeCred(creds.clientSecret), creds.clientSecret]));

  let lastMsg = "";
  for (const id of ids) {
    for (const secret of secrets) {
      const r = await requestToken(id, secret);
      if (r.ok && r.token) {
        return { accessToken: r.token, obtainedAt: Date.now(), expiresInSec: r.expiresIn ?? 30 * 24 * 60 * 60 };
      }
      lastMsg = `HTTP ${r.status}${r.message ? " " + r.message : ""}`;
    }
  }
  throw new Error(`어드민플러스 토큰 발급 실패 (업체 ${envKey}, ${lastMsg})`);
}


async function getAccessToken(envKey: string): Promise<string> {
  const cached = tokenCacheBySupplier.get(envKey);
  if (cached) {
    const ageMs = Date.now() - cached.obtainedAt;
    const ttlMs = cached.expiresInSec * 1000;
    if (ageMs < ttlMs - TOKEN_REFRESH_MARGIN_MS) {
      return cached.accessToken;
    }
  }
  const fresh = await fetchNewToken(envKey);
  tokenCacheBySupplier.set(envKey, fresh);
  return fresh.accessToken;
}

async function callSellerApi<T>(
  envKey: string,
  path: string,
  init: RequestInit = {}
): Promise<AdminPlusEnvelope<T>> {
  const token = await getAccessToken(envKey);
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* 응답 본문이 없거나 JSON이 아님 */
  }

  if (!res.ok) {
    let msg = `어드민플러스 API 오류 (HTTP ${res.status})`;
    if (json && typeof json === "object") {
      const j = json as { message?: unknown; data?: { errors?: unknown } };
      if (j.message) msg = String(j.message);
      if (j.data && j.data.errors) msg += ` | errors: ${JSON.stringify(j.data.errors)}`;
    }
    return { success: false, message: msg };
  }

  return (json as AdminPlusEnvelope<T>) ?? { success: false, message: "빈 응답" };
}

// ---------------------------------------------------------------------------
// 2) 주문 등록 (POST /v1/seller/orders)
//    금액(price)은 보내지 않는다 — 공급사가 product_code로 매입가를 계산해 결제대기에 띄운다.
// ---------------------------------------------------------------------------

export type AdminPlusOrderItem = {
  /** 공급사에 등록된 상품코드 (product_string과 둘 중 하나) */
  product_code?: string | number;
  /** 상품코드 매칭이 없을 때 상품명으로 자동(임시) 매칭 (product_code와 둘 중 하나) */
  product_string?: string;
  /** 옵션 상품일 때 옵션코드 */
  option_code?: string | number;
  /** 수량 */
  quantity: number;
};

export type CreateAdminPlusOrderParams = {
  /** 우리 쪽 주문번호(+업체) — customer_order_code로 전송. 예: `${orderId}-${supplierId}` */
  customerOrderCode: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverAddressDetail?: string;
  zipcode?: string;
  deliveryMemo?: string;
  items: AdminPlusOrderItem[];
};

export type CreateAdminPlusOrderResult =
  | { success: true; orderKey: string; totalAmount?: number }
  | { success: false; errorMessage: string };

type OrdersApiData = {
  order_key?: string;
  total_amount?: number;
  order_count?: number;
  orders?: { customer_order_code?: string; adminplus_order_code?: string }[];
};

export async function createAdminPlusOrder(
  envKey: string,
  params: CreateAdminPlusOrderParams
): Promise<CreateAdminPlusOrderResult> {
  try {
    const result = await callSellerApi<OrdersApiData>(envKey, "/v1/seller/orders", {
      method: "POST",
      body: JSON.stringify({
        orders: [
          {
            customer_order_code: params.customerOrderCode,
            receiver_name: params.receiverName,
            receiver_tel: params.receiverPhone,
            receiver_hp: params.receiverPhone,
            receiver_zipcode: params.zipcode ?? "",
            receiver_addr1: params.receiverAddress,
            receiver_addr2: params.receiverAddressDetail ?? "",
            delivery_msg: params.deliveryMemo ?? "",
            items: params.items.map((it) => ({
              ...(it.product_code !== undefined ? { product_code: it.product_code } : {}),
              ...(it.product_string ? { product_string: it.product_string } : {}),
              ...(it.option_code !== undefined ? { option_code: it.option_code } : {}),
              qty: it.quantity,
            })),
          },
        ],
      }),
    });

      if (!result.success) {
      const errs = (result.data as (OrdersApiData & { errors?: unknown }) | undefined)?.errors;
      const detail = errs ? ` | errors: ${JSON.stringify(errs)}` : "";
      return { success: false, errorMessage: `${result.message ?? "주문 등록 실패"}${detail}` };
    }

    const orderKey =
      result.data?.order_key ?? result.data?.orders?.[0]?.adminplus_order_code ?? "";
    return { success: true, orderKey, totalAmount: result.data?.total_amount };
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : "어드민플러스 통신 오류",
    };
  }
}

// ---------------------------------------------------------------------------
// 3) 편의 함수: 결제 완료된 우리 주문을 공급사에 "주문 등록"만 올린다 (업체 1곳 기준).
//    결제 접수(입금)는 대표님이 공급사 패널에서 직접 처리하므로 여기서 자동 결제하지 않는다.
//    (세 번째 인자 amount는 하위호환용으로 남겨두었으나 사용하지 않는다.)
// ---------------------------------------------------------------------------

export async function pushOrderToAdminPlus(
  envKey: string,
  orderParams: CreateAdminPlusOrderParams,
  _amount?: number
): Promise<{ success: boolean; adminPlusOrderId?: string; totalAmount?: number; errorMessage?: string }> {
  if (!isAdminPlusConfigured(envKey)) {
    return {
      success: false,
      errorMessage: `업체(${envKey})의 ADMINPLUS_CLIENT_ID/SECRET이 설정되지 않았습니다.`,
    };
  }

  const orderResult = await createAdminPlusOrder(envKey, orderParams);
  if (!orderResult.success) {
    return { success: false, errorMessage: orderResult.errorMessage };
  }

  return {
    success: true,
    adminPlusOrderId: orderResult.orderKey,
    totalAmount: orderResult.totalAmount,
  };
}


// ---------------------------------------------------------------------------
// 4) 주문 조회 → 송장 동기화 (GET /v1/seller/orders, 권한 order.read)
//    발송된 주문의 tracking_number/shipping_company를 customer_order_code로 되찾는다.
// ---------------------------------------------------------------------------

export type AdminPlusTracking = {
  customerOrderCode: string;
  trackingNumber?: string;
  shippingCompany?: string;
  status?: string;
};

type OrdersQueryData = {
  orders?: {
    order_product?: {
      customer_order_code?: string;
      tracking_number?: string;
      shipping_company?: string;
      status?: string;
    }[];
  }[];
  next_cursor?: string;
  has_more?: boolean;
};

export async function fetchAdminPlusTracking(
  envKey: string,
  maxPages = 3
): Promise<{ success: boolean; items: AdminPlusTracking[]; errorMessage?: string }> {
  try {
    const items: AdminPlusTracking[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < maxPages; page++) {
      const qs = new URLSearchParams({ limit: "200" });
      if (cursor) qs.set("cursor", cursor);
      const result = await callSellerApi<OrdersQueryData>(
        envKey,
        `/v1/seller/orders?${qs.toString()}`,
        { method: "GET" }
      );
      if (!result.success) {
        return { success: false, items, errorMessage: result.message ?? "주문 조회 실패" };
      }
      for (const o of result.data?.orders ?? []) {
        for (const op of o.order_product ?? []) {
          if (op.customer_order_code) {
            items.push({
              customerOrderCode: op.customer_order_code,
              trackingNumber: op.tracking_number || undefined,
              shippingCompany: op.shipping_company || undefined,
              status: op.status || undefined,
            });
          }
        }
      }
      if (!result.data?.has_more || !result.data?.next_cursor) break;
      cursor = result.data.next_cursor;
    }
    return { success: true, items };
  } catch (err) {
    return {
      success: false,
      items: [],
      errorMessage: err instanceof Error ? err.message : "어드민플러스 통신 오류",
    };
  }
}
