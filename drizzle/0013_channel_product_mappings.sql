-- 스마트스토어 상품/옵션 ↔ 바로산지 상품/옵션 매칭표.
-- 수집한 주문이 어느 상품인지 알아야 공급사와 발주코드를 찾을 수 있다.
CREATE TABLE IF NOT EXISTS "channel_product_mappings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	-- 매칭 키 (하나만 맞아도 됨). 옵션 관리코드가 가장 정확하다.
	"external_option_code" text DEFAULT '' NOT NULL,
	"external_product_id" text DEFAULT '' NOT NULL,
	"external_option_name" text DEFAULT '' NOT NULL,
	-- 바로산지 쪽
	"product_id" text NOT NULL,
	"option_label" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channel_product_mappings_code_idx" ON "channel_product_mappings" ("channel_id", "external_option_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channel_product_mappings_product_idx" ON "channel_product_mappings" ("channel_id", "external_product_id");
--> statement-breakpoint
-- 수집이 어디까지 진행됐는지 기억한다 (다음 수집의 시작 시각)
ALTER TABLE "channels" ADD COLUMN IF NOT EXISTS "last_order_sync_at" timestamp;
