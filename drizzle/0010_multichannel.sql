CREATE TABLE "channels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"monthly_fee" integer DEFAULT 0 NOT NULL,
	"monthly_fee_threshold" integer DEFAULT 0 NOT NULL,
	"settlement_note" text DEFAULT '' NOT NULL,
	"settlement_days" integer DEFAULT 0 NOT NULL,
	"api_status" text DEFAULT '미연동' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_fee_rules" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"category" text DEFAULT '*' NOT NULL,
	"sale_rate" real DEFAULT 0 NOT NULL,
	"payment_rate" real DEFAULT 0 NOT NULL,
	"vat_on_fee" boolean DEFAULT false NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_costs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"cost_price" integer DEFAULT 0 NOT NULL,
	"shipping_cost" integer DEFAULT 0 NOT NULL,
	"packaging_cost" integer DEFAULT 0 NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_spends" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"spent_on" timestamp NOT NULL,
	"amount" integer NOT NULL,
	"product_id" text,
	"memo" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"external_order_id" text NOT NULL,
	"ordered_at" timestamp NOT NULL,
	"status" text DEFAULT '신규' NOT NULL,
	"buyer_name" text DEFAULT '' NOT NULL,
	"receiver_name" text DEFAULT '' NOT NULL,
	"receiver_phone" text DEFAULT '' NOT NULL,
	"receiver_address" text DEFAULT '' NOT NULL,
	"delivery_memo" text DEFAULT '' NOT NULL,
	"shipping_fee" integer DEFAULT 0 NOT NULL,
	"claim_loss" integer DEFAULT 0 NOT NULL,
	"courier_name" text,
	"tracking_number" text,
	"supplier_order_note" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"raw" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_order_id" text NOT NULL,
	"product_id" text,
	"name" text NOT NULL,
	"option" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer NOT NULL,
	"supplier_id" text
);
--> statement-breakpoint
ALTER TABLE "channel_fee_rules" ADD CONSTRAINT "channel_fee_rules_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ad_spends" ADD CONSTRAINT "ad_spends_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "channel_orders" ADD CONSTRAINT "channel_orders_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "channel_order_items" ADD CONSTRAINT "channel_order_items_channel_order_id_channel_orders_id_fk" FOREIGN KEY ("channel_order_id") REFERENCES "public"."channel_orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "channel_orders_channel_ordered_idx" ON "channel_orders" ("channel_id", "ordered_at");
--> statement-breakpoint
CREATE INDEX "channel_order_items_order_idx" ON "channel_order_items" ("channel_order_id");
--> statement-breakpoint
CREATE INDEX "product_costs_product_idx" ON "product_costs" ("product_id", "effective_from");
--> statement-breakpoint
CREATE INDEX "ad_spends_channel_date_idx" ON "ad_spends" ("channel_id", "spent_on");
--> statement-breakpoint
INSERT INTO "channels" ("id","name","sort_order","monthly_fee","monthly_fee_threshold","settlement_note","settlement_days","api_status") VALUES
 ('barosanji','바로산지(자사몰)',0,0,0,'페이앱/페이맵 정산 주기 기준',3,'자사몰'),
 ('smartstore','네이버 스마트스토어',1,0,0,'구매확정 +1영업일 (빠른정산 시 배송시작 다음날)',1,'미연동'),
 ('coupang','쿠팡',2,55000,1000000,'주정산: 구매확정 후 70%는 15영업일 뒤, 30%는 익익월',21,'미연동'),
 ('domeggook','도매꾹·도매매',3,0,0,'구매확정 +2영업일부터 출금 신청',2,'미연동'),
 ('gmarket','G마켓',4,0,0,'구매결정 +1영업일 (배송완료 8일 후 자동 구매결정)',9,'미연동'),
 ('auction','옥션',5,0,0,'구매결정 즉시 (배송완료 8일 후 자동 구매결정)',8,'미연동'),
 ('st11','11번가',6,0,0,'구매확정 후 정산 (가입 후 확인)',10,'미연동'),
 ('lotteon','롯데온',7,0,0,'가입 후 확인',10,'미연동'),
 ('toss','토스쇼핑',8,0,0,'가입 후 확인',7,'미연동')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "channel_fee_rules" ("channel_id","category","sale_rate","payment_rate","vat_on_fee","effective_from","note") VALUES
 ('barosanji','*',0,0.034,false,'2026-01-01','PG 결제수수료 (페이앱 기준, 실제 계약 요율로 수정)'),
 ('smartstore','*',0.0364,0,false,'2026-01-01','결제수수료 포함 (2.73~3.64%, 유입경로별로 다름)'),
 ('coupang','*',0.10,0.029,true,'2026-01-01','신선식품 카테고리 약 10% + 결제 2.9%, 부가세 별도'),
 ('domeggook','*',0.073,0,false,'2026-01-01','사업자회원 4.0~7.3% (식품 카테고리 정확치는 수수료표 확인)'),
 ('gmarket','*',0.12,0,false,'2026-01-01','카테고리별 상이 — 가입 후 수정'),
 ('auction','*',0.12,0,false,'2026-01-01','카테고리별 상이 — 가입 후 수정'),
 ('st11','*',0.12,0,false,'2026-01-01','카테고리별 상이 — 가입 후 수정'),
 ('lotteon','*',0.12,0,false,'2026-01-01','카테고리별 상이 — 가입 후 수정'),
 ('toss','*',0.06,0,false,'2026-01-01','가입 후 확인');
