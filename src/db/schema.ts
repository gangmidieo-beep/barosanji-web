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
