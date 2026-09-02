ALTER TABLE "products" ADD COLUMN "commission_rate" real DEFAULT 0.15 NOT NULL;
ALTER TABLE "orders" ADD COLUMN "referrer_partner_id" text;
ALTER TABLE "orders" ADD COLUMN "referrer_link_id" text;
ALTER TABLE "order_items" ADD COLUMN "commission_rate" real;
ALTER TABLE "order_items" ADD COLUMN "commission_amount" integer;
CREATE TABLE "partners" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"ref_code" text NOT NULL,
	"bank_name" text DEFAULT '' NOT NULL,
	"bank_account" text DEFAULT '' NOT NULL,
	"bank_holder" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "partners_email_unique" UNIQUE("email"),
	CONSTRAINT "partners_ref_code_unique" UNIQUE("ref_code")
);
CREATE TABLE "links" (
	"id" text PRIMARY KEY NOT NULL,
	"partner_id" text NOT NULL,
	"code" text NOT NULL,
	"product_id" text,
	"channel" text DEFAULT '' NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"order_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "links_code_unique" UNIQUE("code")
);
CREATE TABLE "clicks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"link_id" text,
	"partner_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
