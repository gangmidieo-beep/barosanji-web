/**
 * 어드민플러스(AdminPlus) Open API v1 (For Seller) 연동 헬퍼
 *
 * 우리 쇼핑몰(바로산지)에서 고객이 결제(PayApp)를 완료하면, 그 주문을
 * 도매 공급사가 보고 발송할 수 있도록 어드민플러스 쪽으로 "발주"를 올려주는 역할.
 * 즉 PayApp(결제 수납)과 AdminPlus(산지/도매사 발주 전달)는 서로 다른, 상호 보완적인
 * 두 개의 연동입니다 — 하나가 다른 하나를 대체하지 않습니다.
 *
 * **다중 업체 지원**: 공급업체(산지/도매사)마다 어드민플러스 client_id/secret이
 * 다르므로, 아래 함수들은 모두 어떤 업체인지를 나타내는 `envKey`(src/lib/suppliers.ts
 * 참고)를 첫 인자로 받습니다. 토큰도 업체별로 따로 캐시합니다.
 *
 * ⚠️ 아래 구현은 대표님이 채팅으로 붙여주신 "어드민플러스 Open API v1 (For Seller)"
 *    문서 내용을 기준으로 작성했습니다. 다만 이 파일을 작성하는 시점에 세션 컨텍스트가
 *    한 번 정리(compaction)되면서 문서의 파라미터 이름 등 세부 스펙 원문을 제가 다시
 *    직접 대조하지 못했습니다. 실제 연동 전에 반드시:
 *      1) 어드민플러스에서 발급받은 client_id/client_secret으로 토큰 발급이 실제로
 *         되는지,
 *      2) 주문 등록(POST /v1/seller/orders) 요청 바디의 필드명이 실제 문서와
 *         일치하는지 (특히 상품 매칭에 product_code를 쓸지 product_string을 쓸지),
 *      3) 결제 접수(POST /v1/seller/payments) 호출이 필요한 시점/필드
 *    를 실제 문서 재확인 또는 어드민플러스 측(yatta78@gmail.com) 문의로 검증해 주세요.
 *    문서 원문을 다시 붙여주시면 바로 필드명을 맞춰 수정하겠습니다.
 *
 * 필요한 환경변수 (.env.local) — 업체별로 envKey를 접미사로 붙임 (예: A, B, C):
 *   ADMINPLUS_CLIENT_ID_A / ADMINPLUS_CLIENT_SECRET_A   - "○○청과" 업체 키
 *   ADMINPLUS_CLIENT_ID_B / ADMINPLUS_CLIENT_SECRET_B   - "△△수산" 업체 키
 *   ADMINPLUS_API_BASE                                   - API 베이스 URL (공통, 기본값: https://api.adminplus.co.kr)
 *
 * 절대 하드코딩하지 말 것: client_id/secret은 반드시 환경변수로만 관리합니다.
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

// ---------------------------------------------------------------------------
// 1) OAuth 2.0 Client Credentials 토큰 발급 (POST /oauth/token)
//    토큰 유효기간 30일 — 매 요청마다 새로 받지 않고, 만료 전까지 업체별로 재사용/캐시한다.
// ---------------------------------------------------------------------------

type TokenCache = {
  accessToken: string;
  obtainedAt: number; // epoch ms
  expiresInSec: number;
};

// envKey별로 토큰을 따로 캐시 (업체마다 계정이 다르므로)
const tokenCacheBySupplier = new Map<string, TokenCache>();

// 만료 1일 전에는 미리 갱신해서 경계 케이스를 피한다
const TOKEN_REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000;

async function fetchNewToken(envKey: string): Promise<TokenCache> {
  const creds = getSupplierCredentials(envKey);
  if (!creds) {
    throw new Error(`업체(${envKey})의 ADMINPLUS_CLIENT_ID/SECRET이 설정되어 있지 않습니다.`);
  }

  const res = await fetch(`${apiBase()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`어드민플러스 토큰 발급 실패 (업체 ${envKey}, HTTP ${res.status})`);
  }

  const json = await res.json();
  // 예상 응답 형태: { access_token, token_type, expires_in }
  if (!json.access_token) {
    throw new Error(`어드민플러스 토큰 발급 응답에 access_token이 없습니다 (업체 ${envKey}).`);
  }

  return {
    accessToken: json.access_token,
    obtainedAt: Date.now(),
    expiresInSec: json.expires_in ?? 30 * 24 * 60 * 60, // 기본 30일 가정
  };
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
    // 응답 본문이 없거나 JSON이 아닌 경우
  }

  if (!res.ok) {
    const msg =
      (json && typeof json === "object" && "message" in json
        ? String((json as { message?: unknown }).message)
        : null) ?? `어드민플러스 API 오류 (HTTP ${res.status})`;
    return { success: false, message: msg };
  }

  return (json as AdminPlusEnvelope<T>) ?? { success: false, message: "빈 응답" };
}

// ---------------------------------------------------------------------------
// 2) 주문 등록 (POST /v1/seller/orders)
//    PayApp 결제가 완료된 우리 주문을, 해당 업체가 처리할 수 있도록
//    그 업체의 어드민플러스 계정에 발주 형태로 올린다.
// ---------------------------------------------------------------------------

export type AdminPlusOrderItem = {
  /** 어드민플러스에 등록된 상품코드로 매칭하는 경우 */
  product_code?: string;
  /** 상품코드 매칭이 안 되어 있을 때 상품명 문자열로 넘기는 경우 (임시등록) */
  product_string?: string;
  quantity: number;
  price?: number;
};

export type CreateAdminPlusOrderParams = {
  /** 우리 쪽 주문번호 — 어드민플러스 응답과 우리 DB를 매칭하는 키. 한 주문에 업체가
   *  여러 곳이면 업체별로 분리해서 호출하므로, 보통 `${orderId}-${supplierId}` 형태로 넘긴다. */
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
  | { success: true; adminPlusOrderId: string }
  | { success: false; errorMessage: string };

export async function createAdminPlusOrder(
  envKey: string,
  params: CreateAdminPlusOrderParams
): Promise<CreateAdminPlusOrderResult> {
  try {
    const result = await callSellerApi<{ order_id?: string; id?: string }>(
      envKey,
      "/v1/seller/orders",
      {
        method: "POST",
        body: JSON.stringify({
          customer_order_code: params.customerOrderCode,
          receiver: {
            name: params.receiverName,
            phone: params.receiverPhone,
            address: params.receiverAddress,
            address_detail: params.receiverAddressDetail ?? "",
            zipcode: params.zipcode ?? "",
          },
          memo: params.deliveryMemo ?? "",
          items: params.items.map((it) => ({
            ...(it.product_code ? { product_code: it.product_code } : {}),
            ...(it.product_string ? { product_string: it.product_string } : {}),
            quantity: it.quantity,
            ...(it.price !== undefined ? { price: it.price } : {}),
          })),
        }),
      }
    );

    if (!result.success) {
      return { success: false, errorMessage: result.message ?? "발주 등록 실패" };
    }

    const orderId = result.data?.order_id ?? result.data?.id ?? "";
    return { success: true, adminPlusOrderId: orderId };
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : "어드민플러스 통신 오류",
    };
  }
}

// ---------------------------------------------------------------------------
// 3) 결제 접수 (POST /v1/seller/payments)
//    PayApp에서 실제 결제가 완료되었음을 어드민플러스 쪽 해당 발주 건에 알려서
//    "결제완료" 상태로 넘겨준다. (도매사가 결제 대기 주문으로 오인해 보류하지 않도록)
// ---------------------------------------------------------------------------

export type SubmitAdminPlusPaymentParams = {
  adminPlusOrderId: string;
  amount: number;
  paidAt?: string; // ISO string, 생략 시 서버 현재시각 사용 가정
};

export async function submitAdminPlusPayment(
  envKey: string,
  params: SubmitAdminPlusPaymentParams
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    const result = await callSellerApi<unknown>(envKey, "/v1/seller/payments", {
      method: "POST",
      body: JSON.stringify({
        order_id: params.adminPlusOrderId,
        amount: params.amount,
        ...(params.paidAt ? { paid_at: params.paidAt } : {}),
      }),
    });
    if (!result.success) {
      return { success: false, errorMessage: result.message ?? "결제 접수 실패" };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : "어드민플러스 통신 오류",
    };
  }
}

// ---------------------------------------------------------------------------
// 4) 편의 함수: 결제 완료 이후 한 번에 "발주 등록 + 결제 접수"까지 처리 (업체 1곳 기준)
// ---------------------------------------------------------------------------

export async function pushOrderToAdminPlus(
  envKey: string,
  orderParams: CreateAdminPlusOrderParams,
  amount: number
): Promise<{ success: boolean; adminPlusOrderId?: string; errorMessage?: string }> {
  if (!isAdminPlusConfigured(envKey)) {
    // 해당 업체의 자격증명이 아직 설정되지 않았다면 조용히 스킵 (개발/데모 단계 대비)
    return {
      success: false,
      errorMessage: `업체(${envKey})의 ADMINPLUS_CLIENT_ID/SECRET이 설정되지 않았습니다.`,
    };
  }

  const orderResult = await createAdminPlusOrder(envKey, orderParams);
  if (!orderResult.success) {
    return { success: false, errorMessage: orderResult.errorMessage };
  }

  const paymentResult = await submitAdminPlusPayment(envKey, {
    adminPlusOrderId: orderResult.adminPlusOrderId,
    amount,
  });
  if (!paymentResult.success) {
    return {
      success: false,
      adminPlusOrderId: orderResult.adminPlusOrderId,
      errorMessage: `발주는 등록되었으나 결제 접수 실패: ${paymentResult.errorMessage}`,
    };
  }

  return { success: true, adminPlusOrderId: orderResult.adminPlusOrderId };
}
