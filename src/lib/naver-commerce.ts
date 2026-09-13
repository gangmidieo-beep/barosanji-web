/**
 * 네이버 커머스API(스마트스토어) 연동 헬퍼 — 커머스API센터(https://apicenter.commerce.naver.com) 기준.
 *
 * 목적: 스마트스토어 "등록 정보 검토"에서 미등록으로 잡히는 항목
 *   - 브랜드 / 제조사  → originProduct.detailAttribute.naverShoppingSearchInfo
 *   - 속성            → originProduct.detailAttribute.productAttributes
 *   - 상품명           → originProduct.name
 * 을 API로 일괄 점검/수정하기 위한 최소 클라이언트.
 *
 * 인증: OAuth2 Client Credentials + bcrypt 서명.
 *   sign = base64( bcrypt(`${client_id}_${timestamp}`, client_secret) )
 *   POST /external/v1/oauth2/token (x-www-form-urlencoded)
 *     client_id, timestamp, client_secret_sign, grant_type=client_credentials, type=SELF
 *   → { access_token, expires_in, token_type }
 *   client_secret 자체가 bcrypt salt($2a$04$...) 형태라 hashSync의 salt 인자로 그대로 넣는다.
 *
 * ⚠️ 원상품 수정(PUT)은 부분 수정이 아니다. 요청에 넣지 않은 필드는 "생략 가능"이라고
 *    문서에 명시된 것(예: detailContent)만 유지되고, 나머지는 사라진다.
 *    그래서 이 파일의 수정 함수는 반드시 "조회 → 병합 → 전체 전송" 순서로만 쓴다.
 *
 * 자격증명은 절대 코드에 넣지 말 것. 환경변수로만 관리:
 *   NAVER_COMMERCE_CLIENT_ID / NAVER_COMMERCE_CLIENT_SECRET
 */

import bcrypt from "bcryptjs";

const DEFAULT_BASE_URL = "https://api.commerce.naver.com";

function apiBase(): string {
  return process.env.NAVER_COMMERCE_API_BASE || DEFAULT_BASE_URL;
}

export function isNaverCommerceConfigured(): boolean {
  return Boolean(process.env.NAVER_COMMERCE_CLIENT_ID && process.env.NAVER_COMMERCE_CLIENT_SECRET);
}

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.NAVER_COMMERCE_CLIENT_ID;
  const clientSecret = process.env.NAVER_COMMERCE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "NAVER_COMMERCE_CLIENT_ID / NAVER_COMMERCE_CLIENT_SECRET 환경변수가 없습니다. " +
        "커머스API센터에서 애플리케이션을 등록하고 발급받은 값을 넣어주세요."
    );
  }
  return { clientId, clientSecret };
}

// ---------------------------------------------------------------------------
// 1) 토큰 발급 (만료 전까지 재사용)
// ---------------------------------------------------------------------------

type TokenCache = { accessToken: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

/** 커머스API 전자서명: base64( bcrypt(`${clientId}_${timestamp}`, clientSecret) ) */
export function signClientSecret(clientId: string, clientSecret: string, timestamp: number): string {
  const hashed = bcrypt.hashSync(`${clientId}_${timestamp}`, clientSecret);
  return Buffer.from(hashed, "utf-8").toString("base64");
}

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  // 만료 60초 전부터는 새로 받는다 (시계 오차 여유)
  if (tokenCache && tokenCache.expiresAt - 60_000 > now) return tokenCache.accessToken;

  const { clientId, clientSecret } = getCredentials();
  const timestamp = Date.now();
  const body = new URLSearchParams({
    client_id: clientId,
    timestamp: String(timestamp),
    client_secret_sign: signClientSecret(clientId, clientSecret, timestamp),
    grant_type: "client_credentials",
    type: "SELF",
  });

  const res = await fetch(`${apiBase()}/external/v1/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`커머스API 토큰 발급 실패 (${res.status}): ${text.slice(0, 400)}`);
  }
  const json = JSON.parse(text) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error(`커머스API 토큰 응답에 access_token이 없습니다: ${text.slice(0, 400)}`);

  tokenCache = {
    accessToken: json.access_token,
    expiresAt: now + (json.expires_in ?? 3600) * 1000,
  };
  return tokenCache.accessToken;
}

/** 테스트/스크립트에서 토큰 캐시를 비우고 싶을 때 */
export function resetTokenCache(): void {
  tokenCache = null;
}

// ---------------------------------------------------------------------------
// 2) 공통 요청 래퍼
// ---------------------------------------------------------------------------

export class NaverCommerceError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    message: string
  ) {
    super(message);
    this.name = "NaverCommerceError";
  }
}

async function request<T>(method: string, path: string, payload?: unknown): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new NaverCommerceError(
      res.status,
      text,
      `커머스API ${method} ${path} 실패 (${res.status}): ${text.slice(0, 600)}`
    );
  }
  return (text ? JSON.parse(text) : null) as T;
}

// ---------------------------------------------------------------------------
// 3) 타입 (필요한 필드만. 나머지는 통과시켜야 하므로 인덱스 시그니처를 둔다)
// ---------------------------------------------------------------------------

/** 상품 속성 한 줄. 선택형이면 attributeValueSeq, 직접입력형이면 attributeRealValue를 쓴다. */
export type ProductAttribute = {
  attributeSeq: number;
  attributeValueSeq?: number;
  attributeRealValue?: string;
  attributeRealValueUnitCode?: string;
};

export type NaverShoppingSearchInfo = {
  modelId?: number;
  modelName?: string;
  manufacturerName?: string;
  brandName?: string;
  /** true면 카탈로그 매칭된 상품 — 수정 시 이 객체 자체를 빼야 정상 처리된다 */
  catalogMatchingYn?: boolean;
  [key: string]: unknown;
};

export type OriginProductDetailAttribute = {
  naverShoppingSearchInfo?: NaverShoppingSearchInfo;
  productAttributes?: ProductAttribute[];
  seoInfo?: { sellerTags?: { text: string }[]; [key: string]: unknown };
  [key: string]: unknown;
};

export type OriginProduct = {
  name: string;
  leafCategoryId?: string;
  detailAttribute?: OriginProductDetailAttribute;
  [key: string]: unknown;
};

/** 원상품 조회/수정 요청·응답 봉투 */
export type ProductEnvelope = {
  originProduct: OriginProduct;
  smartstoreChannelProduct?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ProductSearchItem = {
  originProductNo: number;
  channelProducts?: {
    channelProductNo?: number;
    name?: string;
    statusType?: string;
    categoryId?: string;
    wholeCategoryName?: string;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
};

export type ProductSearchPage = {
  contents: ProductSearchItem[];
  totalElements: number;
  page: number;
  size: number;
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// 4) 상품 API
// ---------------------------------------------------------------------------

/**
 * 상품 목록 조회 (POST /external/v1/products/search).
 * 이 응답에는 브랜드/제조사/속성이 들어있지 않다 — 상세는 원상품 조회로 따로 받아야 한다.
 */
export async function searchProducts(params: {
  page?: number;
  size?: number;
  productStatusTypes?: string[];
}): Promise<ProductSearchPage> {
  return request<ProductSearchPage>("POST", "/external/v1/products/search", {
    page: params.page ?? 1,
    size: params.size ?? 100,
    productStatusTypes: params.productStatusTypes ?? ["SALE", "OUTOFSTOCK", "SUSPENSION", "WAIT"],
  });
}

/** 판매중인 전 상품의 originProductNo를 페이지를 넘겨가며 모두 모은다. */
export async function listAllProducts(
  opts: { pageSize?: number; productStatusTypes?: string[]; onPage?: (page: ProductSearchPage) => void } = {}
): Promise<ProductSearchItem[]> {
  const size = opts.pageSize ?? 100;
  const all: ProductSearchItem[] = [];
  for (let page = 1; ; page += 1) {
    const res = await searchProducts({ page, size, productStatusTypes: opts.productStatusTypes });
    opts.onPage?.(res);
    all.push(...(res.contents ?? []));
    const total = res.totalElements ?? all.length;
    if (all.length >= total || (res.contents?.length ?? 0) === 0) break;
    await sleep(300);
  }
  return all;
}

/** 원상품 조회 — 브랜드/제조사/속성이 실제로 들어있는 유일한 경로 */
export async function getOriginProduct(originProductNo: number): Promise<ProductEnvelope> {
  return request<ProductEnvelope>("GET", `/external/v2/products/origin-products/${originProductNo}`);
}

/**
 * 원상품 수정.
 * ⚠️ 전체 페이로드를 보내야 한다. 반드시 getOriginProduct로 받은 객체를 병합해서 넘길 것.
 */
export async function updateOriginProduct(
  originProductNo: number,
  payload: ProductEnvelope
): Promise<unknown> {
  return request<unknown>("PUT", `/external/v2/products/origin-products/${originProductNo}`, payload);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// 5) 검토 항목 판정 + 안전한 병합
// ---------------------------------------------------------------------------

export type ReviewGaps = {
  /** 브랜드 미등록 */
  brand: boolean;
  /** 제조사 미등록 */
  manufacturer: boolean;
  /** 속성 미등록 */
  attributes: boolean;
  /** 카탈로그 매칭된 상품 — naverShoppingSearchInfo를 건드리면 안 된다 */
  catalogMatched: boolean;
};

export function findReviewGaps(envelope: ProductEnvelope): ReviewGaps {
  const detail = envelope.originProduct?.detailAttribute ?? {};
  const info = detail.naverShoppingSearchInfo;
  return {
    brand: !info?.brandName,
    manufacturer: !info?.manufacturerName,
    attributes: !detail.productAttributes || detail.productAttributes.length === 0,
    catalogMatched: info?.catalogMatchingYn === true,
  };
}

export type ProductPatch = {
  name?: string;
  brandName?: string;
  manufacturerName?: string;
  productAttributes?: ProductAttribute[];
};

/**
 * 조회한 원상품에 패치를 덮어쓴 "전체 페이로드"를 만든다.
 * - 원본 객체는 건드리지 않는다(깊은 복사).
 * - 카탈로그 매칭 상품은 naverShoppingSearchInfo를 통째로 제외한다(네이버 공식 안내).
 * - 이미 값이 있는 항목은 덮어쓰지 않는다 — 비어 있는 칸만 채운다.
 */
export function buildUpdatePayload(current: ProductEnvelope, patch: ProductPatch): ProductEnvelope {
  const next = structuredClone(current) as ProductEnvelope;
  const origin = next.originProduct;
  if (!origin) throw new Error("originProduct가 없는 응답입니다 — 조회 결과를 확인하세요.");

  const detail: OriginProductDetailAttribute = origin.detailAttribute ?? {};
  origin.detailAttribute = detail;

  if (patch.name) origin.name = patch.name;

  const catalogMatched = detail.naverShoppingSearchInfo?.catalogMatchingYn === true;
  if (catalogMatched) {
    // 카탈로그 매칭 상품은 이 필드를 포함하면 수정이 거부된다. 브랜드/제조사도 손대지 않는다.
    delete detail.naverShoppingSearchInfo;
  } else if (patch.brandName || patch.manufacturerName) {
    const info: NaverShoppingSearchInfo = detail.naverShoppingSearchInfo ?? {};
    if (patch.brandName && !info.brandName) info.brandName = patch.brandName;
    if (patch.manufacturerName && !info.manufacturerName) info.manufacturerName = patch.manufacturerName;
    detail.naverShoppingSearchInfo = info;
  }

  if (patch.productAttributes?.length && !(detail.productAttributes?.length)) {
    detail.productAttributes = patch.productAttributes;
  }

  return next;
}
