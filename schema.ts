import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

/**
 * 실제 상품/거래처/주문 데이터가 저장되는 곳.
 * 여기서부터는 "진짜 DB"이고, 관리자 화면과 실제 쇼핑몰 화면이 모두 이 데이터를 함께 봅니다.
 * (예전처럼 브라우저 localStorage에만 저장되던 데모 상태가 아닙니다.)
 */

export type ProductOption = { label: string; price: number };

export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** ADMINPLUS_CLIENT_ID_<envKey> / ADMINPLUS_CLIENT_SECRET_<envKey> 환경변수 접미사 */
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
  /** 대표 이모지(사진 없을 때 기본값) */
  image: text("image").notNull().default("🥬"),
  /** 썸네일 갤러리 (data URL 목록, 최대 10장, 첫 장이 대표 이미지) */
  images: jsonb("images").$type<string[]>().notNull().default([]),
  /** 상세페이지 하단용 이미지 목록 */
  detailImages: jsonb("detail_images").$type<string[]>().notNull().default([]),
  description: text("description").notNull().default(""),
  supplierId: text("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  /** 1인당 최대 구매 수량 (비어있으면 기본값 적용) */
  maxQty: integer("max_qty"),
  /** 옵션(용량/무게 등) 목록 — 있으면 상세페이지에서 옵션을 고르게 함 */
  options: jsonb("options").$type<ProductOption[]>(),
  /** 쇼핑몰 노출 여부 (숨김 처리) */
  visible: boolean("visible").notNull().default(true),
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
  /** 페이앱 orderId(var1)로 그대로 사용 — ORD-<timestamp> 형태 */
  id: text("id").primaryKey(),
  receiverName: text("receiver_name").notNull(),
  receiverPhone: text("receiver_phone").notNull(),
  receiverAddress: text("receiver_address").notNull(),
  receiverAddressDetail: text("receiver_address_detail"),
  deliveryMemo: text("delivery_memo"),
  amount: integer("amount").notNull(),
  status: text("status").$type<OrderStatus>().notNull().default("결제대기"),
  /** 페이앱이 보내온 원본 pay_state 값 (디버깅용) */
  payState: text("pay_state"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  /** 주문 당시 상품명/단위/가격 스냅샷 — 나중에 상품이 바뀌거나 삭제돼도 주문 내역은 그대로 남아야 함 */
  productId: text("product_id"),
  name: text("name").notNull(),
  unit: text("unit").notNull().default(""),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(),
  supplierId: text("supplier_id").notNull(),
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
