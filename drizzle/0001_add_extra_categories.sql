ALTER TABLE "products" ADD COLUMN "extra_categories" jsonb DEFAULT '[]'::jsonb NOT NULL;
