import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  bigserial,
} from "drizzle-orm/pg-core";

export type ProductOption = { label: string; price: number; code?: string };

export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  envKey: text("env_key").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  farm: text("farm").notNull(),
  region: text("region").notNull(),
  price: integer("price").notNull(),
  originalPrice: integer("original_price").notNull(),
  unit: text("unit").notNull(),
  badge: text("badge"),
  rating: real("rating").notNull().default(5),
  reviewCount: integer("review_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  image: text("image").notNull().default("🥬"),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  detailImages: jsonb("detail_images").$type<string[]>().notNull().default([]),
  description: text("description").notNull().default(""),
  supplierId: text("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  maxQty: integer("max_qty"),
  options: jsonb("options").$type<ProductOption[]>(),
  extraCategories: jsonb("extra_categories").$type<string[]>().notNull().default([]),
  visible: boolean("visible").notNull().default(true),
  soldOut: boolean("sold_out").notNull().default(false),
  supplierProductCode: text("supplier_product_code"),
  commissionRate: real("commission_rate").notNull().default(0.15),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderStatusValues = [
  "결제대기",
  "결제완료",
  "배송준비",
  "배송중",
  "배송완료",
  "결제취소",
] as const;
export type OrderStatus = (typeof orderStatusValues)[number];

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  receiverName: text("receiver_name").notNull(),
  receiverPhone: text("receiver_phone").notNull(),
  receiverAddress: text("receiver_address").notNull(),
  receiverAddressDetail: text("receiver_address_detail"),
  deliveryMemo: text("delivery_memo"),
  amount: integer("amount").notNull(),
  status: text("status").$type<OrderStatus>().notNull().default("결제대기"),
  payState: text("pay_state"),
  courierName: text("courier_name"),
  trackingNumber: text("tracking_number"),
  referrerPartnerId: text("referrer_partner_id"),
  referrerLinkId: text("referrer_link_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id"),
  name: text("name").notNull(),
  unit: text("unit").notNull().default(""),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(),
  supplierId: text("supplier_id").notNull(),
  commissionRate: real("commission_rate"),
  commissionAmount: integer("commission_amount"),
});

export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey().default("default"),
  companyName: text("company_name").notNull().default("(주)바로산지"),
  ceoName: text("ceo_name").notNull().default("홍길동"),
  bizRegNo: text("biz_reg_no").notNull().default("000-00-00000"),
  mailOrderNo: text("mail_order_no").notNull().default("제0000-경기용인-0000호"),
  address: text("address").notNull().default("경기도 용인시 000로 00"),
  csPhone: text("cs_phone").notNull().default("1588-0000"),
  csEmail: text("cs_email").notNull().default("cs@farm-mall.example"),
  kakaoChannelUrl: text("kakao_channel_url").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  kakaoId: text("kakao_id").primaryKey(),
  nickname: text("nickname").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  receiverName: text("receiver_name").notNull().default(""),
  receiverAddress: text("receiver_address").notNull().default(""),
  receiverAddressDetail: text("receiver_address_detail").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at").notNull().defaultNow(),
});

// ===== 제휴(추천인) 프로그램 =====
export const partners = pgTable("partners", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull().default(""),
  refCode: text("ref_code").notNull().unique(),
  bankName: text("bank_name").notNull().default(""),
  bankAccount: text("bank_account").notNull().default(""),
  bankHolder: text("bank_holder").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const links = pgTable("links", {
  id: text("id").primaryKey(),
  partnerId: text("partner_id").notNull(),
  code: text("code").notNull().unique(),
  productId: text("product_id"),
  channel: text("channel").notNull().default(""),
  clickCount: integer("click_count").notNull().default(0),
  orderCount: integer("order_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clicks = pgTable("clicks", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  linkId: text("link_id"),
  partnerId: text("partner_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const settlements = pgTable("settlements", {
  id: text("id").primaryKey(),
  partnerId: text("partner_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("requested"),
  bankName: text("bank_name").notNull().default(""),
  bankAccount: text("bank_account").notNull().default(""),
  bankHolder: text("bank_holder").notNull().default(""),
  note: text("note").notNull().default(""),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
});

// ===== 멀티채널 통합관리 (오픈마켓 판매 · 수수료 · 원가 · 광고비 · 순수익) =====

/** 판매 채널 (barosanji = 자사몰, 나머지는 오픈마켓) */
export const channels = pgTable("channels", {
  id: text("id").primaryKey(), // barosanji, smartstore, coupang, domeggook, gmarket, auction, st11, lotteon, toss
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  /** 월 고정비 (예: 쿠팡 월매출 100만 원 이상 시 서비스 이용료 55,000원). 주문 수로 나눠 배분 */
  monthlyFee: integer("monthly_fee").notNull().default(0),
  /** 고정비가 붙기 시작하는 월매출 기준 (0이면 항상 부과) */
  monthlyFeeThreshold: integer("monthly_fee_threshold").notNull().default(0),
  /** 정산 규칙 설명 + 정산 예정일 계산용 일수 (구매확정/배송완료 기준 며칠 뒤) */
  settlementNote: text("settlement_note").notNull().default(""),
  settlementDays: integer("settlement_days").notNull().default(0),
  /** API 연동 상태 메모 (키 발급 전/심사중/연동완료) */
  apiStatus: text("api_status").notNull().default("미연동"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** 채널 × 카테고리 × 적용시작일 수수료 규칙 (과거 주문 재계산 방지용 이력 관리) */
export const channelFeeRules = pgTable("channel_fee_rules", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  channelId: text("channel_id").notNull().references(() => channels.id),
  /** 상품 카테고리. "*" 이면 전체 기본값 */
  category: text("category").notNull().default("*"),
  /** 판매수수료율 (0.1 = 10%) */
  saleRate: real("sale_rate").notNull().default(0),
  /** 결제수수료율 (쿠팡 2.9% 등, 스마트스토어처럼 판매수수료에 포함이면 0) */
  paymentRate: real("payment_rate").notNull().default(0),
  /** 수수료에 부가세 10%를 별도로 붙이는지 (쿠팡 true, 스마트스토어 false=포함) */
  vatOnFee: boolean("vat_on_fee").notNull().default(false),
  effectiveFrom: timestamp("effective_from").notNull().defaultNow(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** 상품 원가(매입가) 이력 — 상품 × 적용시작일 */
export const productCosts = pgTable("product_costs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  productId: text("product_id").notNull(),
  /** 공급업체 매입가 (1개 기준) */
  costPrice: integer("cost_price").notNull().default(0),
  /** 공급업체가 청구하는 택배비 (주문 1건 기준) */
  shippingCost: integer("shipping_cost").notNull().default(0),
  /** 포장·부자재비 (1개 기준) */
  packagingCost: integer("packaging_cost").notNull().default(0),
  effectiveFrom: timestamp("effective_from").notNull().defaultNow(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** 광고비 — 채널 × 날짜 (상품 지정 시 그 상품에만 배분) */
export const adSpends = pgTable("ad_spends", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  channelId: text("channel_id").notNull().references(() => channels.id),
  spentOn: timestamp("spent_on").notNull(),
  amount: integer("amount").notNull(),
  productId: text("product_id"),
  memo: text("memo").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const channelOrderStatusValues = [
  "신규",
  "발주완료",
  "배송중",
  "배송완료",
  "구매확정",
  "취소",
  "반품",
] as const;
export type ChannelOrderStatus = (typeof channelOrderStatusValues)[number];

/** 오픈마켓 주문 (API 수집 또는 수동/엑셀 등록). 자사몰 주문은 orders 테이블을 그대로 사용 */
export const channelOrders = pgTable("channel_orders", {
  id: text("id").primaryKey(), // `${channelId}:${externalOrderId}`
  channelId: text("channel_id").notNull().references(() => channels.id),
  externalOrderId: text("external_order_id").notNull(),
  orderedAt: timestamp("ordered_at").notNull(),
  status: text("status").$type<ChannelOrderStatus>().notNull().default("신규"),
  buyerName: text("buyer_name").notNull().default(""),
  receiverName: text("receiver_name").notNull().default(""),
  receiverPhone: text("receiver_phone").notNull().default(""),
  receiverAddress: text("receiver_address").notNull().default(""),
  deliveryMemo: text("delivery_memo").notNull().default(""),
  /** 고객이 부담한 배송비 (매출에 포함) */
  shippingFee: integer("shipping_fee").notNull().default(0),
  /** 반품 배송비·폐기 등 클레임 손실 */
  claimLoss: integer("claim_loss").notNull().default(0),
  courierName: text("courier_name"),
  trackingNumber: text("tracking_number"),
  /** 어드민플러스 발주 결과 메모 */
  supplierOrderNote: text("supplier_order_note").notNull().default(""),
  source: text("source").notNull().default("manual"), // manual | excel | api
  raw: jsonb("raw"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const channelOrderItems = pgTable("channel_order_items", {
  id: text("id").primaryKey(),
  channelOrderId: text("channel_order_id")
    .notNull()
    .references(() => channelOrders.id, { onDelete: "cascade" }),
  /** 바로산지 상품 마스터 ID (매핑 안 되면 null → 원가 0으로 계산되고 경고 표시) */
  productId: text("product_id"),
  name: text("name").notNull(),
  option: text("option").notNull().default(""),
  category: text("category").notNull().default(""),
  quantity: integer("quantity").notNull().default(1),
  /** 판매가 (1개, 채널 표시가) */
  unitPrice: integer("unit_price").notNull(),
  supplierId: text("supplier_id"),
});
