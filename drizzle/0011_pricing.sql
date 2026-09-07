CREATE TABLE "product_pricing_rules" (
	"product_id" text PRIMARY KEY NOT NULL,
	"target_margin_rate" real DEFAULT 0.2 NOT NULL,
	"min_price" integer DEFAULT 0 NOT NULL,
	"max_price" integer DEFAULT 0 NOT NULL,
	"max_change_rate" real DEFAULT 0.3 NOT NULL,
	"round_to" integer DEFAULT 1000 NOT NULL,
	"round_ends_with" integer DEFAULT 900 NOT NULL,
	"auto_suggest" boolean DEFAULT true NOT NULL,
	"season_start" text DEFAULT '' NOT NULL,
	"season_end" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_product_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"product_id" text NOT NULL,
	"price" integer NOT NULL,
	"external_product_id" text,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_suggestions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text DEFAULT '' NOT NULL,
	"current_price" integer DEFAULT 0 NOT NULL,
	"suggested_price" integer NOT NULL,
	"cost_price" integer DEFAULT 0 NOT NULL,
	"fee_rate" real DEFAULT 0 NOT NULL,
	"current_margin" real DEFAULT 0 NOT NULL,
	"suggested_margin" real DEFAULT 0 NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"capped" text DEFAULT '' NOT NULL,
	"status" text DEFAULT '대기' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"decided_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "market_prices" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"item_name" text NOT NULL,
	"grade" text DEFAULT '' NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"surveyed_on" timestamp NOT NULL,
	"source" text DEFAULT 'kamis' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_product_prices" ADD CONSTRAINT "channel_product_prices_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "price_suggestions" ADD CONSTRAINT "price_suggestions_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "channel_product_prices_product_idx" ON "channel_product_prices" ("product_id");
--> statement-breakpoint
CREATE INDEX "price_suggestions_batch_idx" ON "price_suggestions" ("batch_id");
--> statement-breakpoint
CREATE INDEX "price_suggestions_status_idx" ON "price_suggestions" ("status", "created_at");
--> statement-breakpoint
CREATE INDEX "market_prices_item_idx" ON "market_prices" ("item_name", "surveyed_on");
