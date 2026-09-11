-- 공급사별 발주 사용 여부 (false면 발주도 막고 상품도 품절 처리)
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "ordering_enabled" boolean DEFAULT true NOT NULL;

-- 자사몰 주문의 발주 결과 기록 (지금까지는 콘솔 로그로만 남아 확인이 불가능했음)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "supplier_order_status" text DEFAULT '미발송' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "supplier_order_note" text DEFAULT '' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "supplier_ordered_at" timestamp;
