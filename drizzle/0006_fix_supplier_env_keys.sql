UPDATE "suppliers" SET "name" = '팡이네', "env_key" = 'PANGINE' WHERE "env_key" = 'A';
UPDATE "suppliers" SET "name" = '신흥유통', "env_key" = 'SINHEUNG' WHERE "env_key" = 'B';
UPDATE "suppliers" SET "name" = '늘푸른', "env_key" = 'NEULPUREUN' WHERE "env_key" = 'C';
INSERT INTO "suppliers" ("id", "name", "env_key") VALUES ('supplier-food100', '식품백억 (엑셀발주)', 'FOOD100') ON CONFLICT ("id") DO NOTHING;
