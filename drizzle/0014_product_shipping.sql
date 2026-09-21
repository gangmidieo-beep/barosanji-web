
-- 상품별 배송비 정책.
-- 공급사가 배송비를 따로 받는 상품만 금액이 들어가고, 무료배송 상품은 0이다.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "shipping_fee" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- 이 수량 이상 담으면 배송비가 면제되는 기준 수량 (0이면 면제 조건 없음)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "free_shipping_qty" integer DEFAULT 0 NOT NULL;
