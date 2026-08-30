CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text,
	"name" text NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"quantity" integer NOT NULL,
	"price" integer NOT NULL,
	"supplier_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"receiver_name" text NOT NULL,
	"receiver_phone" text NOT NULL,
	"receiver_address" text NOT NULL,
	"receiver_address_detail" text,
	"delivery_memo" text,
	"amount" integer NOT NULL,
	"status" text DEFAULT '결제대기' NOT NULL,
	"pay_state" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"farm" text NOT NULL,
	"region" text NOT NULL,
	"price" integer NOT NULL,
	"original_price" integer NOT NULL,
	"unit" text NOT NULL,
	"badge" text,
	"rating" real DEFAULT 5 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"image" text DEFAULT '🥬' NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"detail_images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"supplier_id" text NOT NULL,
	"max_qty" integer,
	"options" jsonb,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"company_name" text DEFAULT '(주)바로산지' NOT NULL,
	"ceo_name" text DEFAULT '홍길동' NOT NULL,
	"biz_reg_no" text DEFAULT '000-00-00000' NOT NULL,
	"mail_order_no" text DEFAULT '제0000-경기용인-0000호' NOT NULL,
	"address" text DEFAULT '경기도 용인시 000로 00' NOT NULL,
	"cs_phone" text DEFAULT '1588-0000' NOT NULL,
	"cs_email" text DEFAULT 'cs@farm-mall.example' NOT NULL,
	"kakao_channel_url" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"env_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
