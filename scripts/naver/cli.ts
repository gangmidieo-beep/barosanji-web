/**
 * 스마트스토어(네이버 커머스API) 등록 정보 검토 일괄 작업 CLI.
 *
 *   npx tsx scripts/naver/cli.ts audit
 *   npx tsx scripts/naver/cli.ts learn
 *   npx tsx scripts/naver/cli.ts apply            # dry-run (아무것도 바꾸지 않음)
 *   npx tsx scripts/naver/cli.ts apply --apply    # 실제 수정
 *
 * 왜 3단계인가:
 *   커머스API에는 "카테고리별로 어떤 속성(attributeSeq)이 있는지" 조회하는 공개 API가 없다.
 *   그래서 카테고리마다 스토어 관리자 화면에서 1건만 손으로 속성을 채워두면(= 씨앗 상품),
 *   learn이 그 상품에서 attributeSeq/attributeValueSeq를 읽어 템플릿으로 저장하고,
 *   apply가 같은 카테고리의 나머지 상품에 그대로 복사한다.
 *
 * 안전장치:
 *   - apply는 기본이 dry-run. --apply를 붙여야만 PUT을 보낸다.
 *   - 이미 값이 있는 항목은 절대 덮어쓰지 않는다(빈 칸만 채움).
 *   - 원상품 수정은 전체 페이로드 전송이므로 항상 "조회 → 병합 → 전송"만 한다.
 *   - 수정 전 원본 응답을 scripts/naver/out/backup/ 에 통째로 저장한다.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import {
  buildUpdatePayload,
  getOriginProduct,
  isNaverCommerceConfigured,
  listAllProducts,
  sleep,
  updateOriginProduct,
  type ProductAttribute,
  type ProductEnvelope,
  type ProductPatch,
} from "../../src/lib/naver-commerce";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT_DIR = path.join(ROOT, "scripts/naver/out");
const BACKUP_DIR = path.join(OUT_DIR, "backup");
const TEMPLATE_FILE = path.join(ROOT, "scripts/naver/attribute-templates.json");
const CONFIG_FILE = path.join(ROOT, "scripts/naver/fill-config.json");

/** .env.local 을 직접 읽어 process.env에 채운다 (tsx는 Next처럼 자동 로드하지 않음) */
function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(ROOT, file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf-8").split("\n")) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      const [, key, rawValue] = m;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.replace(/^["'](.*)["']$/, "$1");
    }
  }
}

type FillConfig = {
  /** 전 상품 공통으로 넣을 기본값 */
  defaults: { brandName?: string; manufacturerName?: string };
  /** 카테고리ID별 덮어쓰기 (없으면 defaults 사용) */
  byCategory?: Record<string, { brandName?: string; manufacturerName?: string }>;
};

type AttributeTemplates = Record<string, { sampleProductNo: number; attributes: ProductAttribute[] }>;

function readJson<T>(file: string, fallback: T): T {
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, "utf-8")) as T;
}

function writeJson(file: string, data: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

type Row = {
  originProductNo: number;
  name: string;
  categoryId: string;
  categoryName: string;
  brandName: string;
  manufacturerName: string;
  attributeCount: number;
  catalogMatched: boolean;
};

/** 전 상품을 원상품 조회까지 돌려 현재 상태를 표로 만든다 (읽기 전용) */
async function collectRows(): Promise<Row[]> {
  const list = await listAllProducts({
    onPage: (p) => console.log(`  목록 조회 ${p.page}페이지 (총 ${p.totalElements}건)`),
  });
  console.log(`상품 ${list.length}건 확인 — 원상품 상세를 하나씩 조회합니다.`);

  const rows: Row[] = [];
  for (const [i, item] of list.entries()) {
    const channel = item.channelProducts?.[0];
    try {
      const envelope = await getOriginProduct(item.originProductNo);
      const detail = envelope.originProduct?.detailAttribute ?? {};
      const info = detail.naverShoppingSearchInfo;
      rows.push({
        originProductNo: item.originProductNo,
        name: envelope.originProduct?.name ?? channel?.name ?? "",
        categoryId: envelope.originProduct?.leafCategoryId ?? channel?.categoryId ?? "",
        categoryName: channel?.wholeCategoryName ?? "",
        brandName: info?.brandName ?? "",
        manufacturerName: info?.manufacturerName ?? "",
        attributeCount: detail.productAttributes?.length ?? 0,
        catalogMatched: info?.catalogMatchingYn === true,
      });
    } catch (err) {
      console.error(`  [조회 실패] ${item.originProductNo}: ${(err as Error).message}`);
    }
    if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${list.length} 조회 완료`);
    await sleep(200); // 커머스API 호출 제한 여유
  }
  return rows;
}

function toCsv(rows: Row[]): string {
  const header = [
    "originProductNo",
    "상품명",
    "카테고리ID",
    "카테고리",
    "브랜드",
    "제조사",
    "속성개수",
    "카탈로그매칭",
  ];
  const escape = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.originProductNo,
      r.name,
      r.categoryId,
      r.categoryName,
      r.brandName,
      r.manufacturerName,
      r.attributeCount,
      r.catalogMatched ? "Y" : "N",
    ]
      .map(escape)
      .join(",")
  );
  return "﻿" + [header.map(escape).join(","), ...lines].join("\n") + "\n";
}

async function cmdAudit(): Promise<void> {
  const rows = await collectRows();
  writeJson(path.join(OUT_DIR, "audit.json"), rows);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, "audit.csv"), toCsv(rows), "utf-8");

  const noBrand = rows.filter((r) => !r.brandName).length;
  const noManufacturer = rows.filter((r) => !r.manufacturerName).length;
  const noAttributes = rows.filter((r) => r.attributeCount === 0).length;
  const catalogMatched = rows.filter((r) => r.catalogMatched).length;

  console.log("\n===== 등록 정보 검토 현황 =====");
  console.log(`전체 상품        ${rows.length}건`);
  console.log(`브랜드 미등록     ${noBrand}건`);
  console.log(`제조사 미등록     ${noManufacturer}건`);
  console.log(`속성 미등록       ${noAttributes}건`);
  console.log(`카탈로그 매칭됨   ${catalogMatched}건 (브랜드/제조사 수정 불가 — 건너뜁니다)`);
  console.log(`\n카테고리별 상품 수:`);
  const byCat = new Map<string, number>();
  for (const r of rows) byCat.set(`${r.categoryId} ${r.categoryName}`, (byCat.get(`${r.categoryId} ${r.categoryName}`) ?? 0) + 1);
  for (const [cat, n] of [...byCat].sort((a, b) => b[1] - a[1])) console.log(`  ${cat}: ${n}건`);
  console.log(`\n결과: ${path.relative(ROOT, OUT_DIR)}/audit.csv, audit.json`);
}

/**
 * 이미 속성이 채워진 상품(= 씨앗 상품)에서 카테고리별 속성 템플릿을 추출한다.
 * 같은 카테고리에 씨앗이 여러 개면 속성 개수가 가장 많은 것을 쓴다.
 */
async function cmdLearn(): Promise<void> {
  const rows = readJson<Row[] | null>(path.join(OUT_DIR, "audit.json"), null) ?? (await collectRows());

  const seeds = new Map<string, Row>();
  for (const r of rows) {
    if (r.attributeCount === 0 || !r.categoryId) continue;
    const prev = seeds.get(r.categoryId);
    if (!prev || r.attributeCount > prev.attributeCount) seeds.set(r.categoryId, r);
  }

  if (seeds.size === 0) {
    console.log(
      "속성이 채워진 상품이 한 건도 없습니다.\n" +
        "카테고리마다 스토어 관리자 화면에서 1건씩 속성을 직접 입력한 뒤 다시 실행해주세요.\n" +
        "(커머스API에는 카테고리별 속성 목록을 내려주는 공개 API가 없습니다.)"
    );
    return;
  }

  const templates: AttributeTemplates = {};
  for (const [categoryId, seed] of seeds) {
    const envelope = await getOriginProduct(seed.originProductNo);
    const attributes = envelope.originProduct?.detailAttribute?.productAttributes ?? [];
    templates[categoryId] = { sampleProductNo: seed.originProductNo, attributes };
    console.log(`  ${categoryId} (${seed.categoryName}): 속성 ${attributes.length}개 — 씨앗 ${seed.originProductNo}`);
    await sleep(200);
  }

  writeJson(TEMPLATE_FILE, templates);
  console.log(`\n템플릿 저장: ${path.relative(ROOT, TEMPLATE_FILE)}`);
  console.log("값이 상품마다 달라야 하는 속성이 있으면 이 파일을 직접 손봐주세요.");
}

async function cmdApply(dryRun: boolean): Promise<void> {
  const rows = readJson<Row[] | null>(path.join(OUT_DIR, "audit.json"), null);
  if (!rows) {
    console.error("먼저 `audit`을 실행해 현황을 만들어주세요.");
    process.exitCode = 1;
    return;
  }
  const templates = readJson<AttributeTemplates>(TEMPLATE_FILE, {});
  const config = readJson<FillConfig>(CONFIG_FILE, { defaults: {} });

  const targets = rows.filter((r) => !r.brandName || !r.manufacturerName || r.attributeCount === 0);
  console.log(`${dryRun ? "[DRY-RUN] " : ""}수정 대상 ${targets.length}건 / 전체 ${rows.length}건\n`);

  let changed = 0;
  let skipped = 0;
  let failed = 0;

  for (const [i, row] of targets.entries()) {
    const override = config.byCategory?.[row.categoryId] ?? {};
    const patch: ProductPatch = {};

    if (!row.catalogMatched) {
      if (!row.brandName) patch.brandName = override.brandName ?? config.defaults.brandName;
      if (!row.manufacturerName) patch.manufacturerName = override.manufacturerName ?? config.defaults.manufacturerName;
    }
    if (row.attributeCount === 0) {
      const template = templates[row.categoryId];
      if (template?.attributes.length) patch.productAttributes = template.attributes;
    }

    const hasPatch = Boolean(patch.brandName || patch.manufacturerName || patch.productAttributes?.length);
    if (!hasPatch) {
      skipped += 1;
      console.log(`  [건너뜀] ${row.originProductNo} ${row.name} — 채울 값이 없습니다 (템플릿/설정 확인)`);
      continue;
    }

    const summary = [
      patch.brandName && `브랜드=${patch.brandName}`,
      patch.manufacturerName && `제조사=${patch.manufacturerName}`,
      patch.productAttributes && `속성 ${patch.productAttributes.length}개`,
    ]
      .filter(Boolean)
      .join(", ");

    if (dryRun) {
      console.log(`  [예정] ${row.originProductNo} ${row.name} → ${summary}`);
      changed += 1;
      continue;
    }

    try {
      // 전체 페이로드 전송이 필요하므로 수정 직전에 최신 상태를 다시 조회한다.
      const current: ProductEnvelope = await getOriginProduct(row.originProductNo);
      mkdirSync(BACKUP_DIR, { recursive: true });
      writeFileSync(
        path.join(BACKUP_DIR, `${row.originProductNo}.json`),
        JSON.stringify(current, null, 2),
        "utf-8"
      );
      await updateOriginProduct(row.originProductNo, buildUpdatePayload(current, patch));
      changed += 1;
      console.log(`  [수정] ${row.originProductNo} ${row.name} → ${summary}`);
    } catch (err) {
      failed += 1;
      console.error(`  [실패] ${row.originProductNo} ${row.name}: ${(err as Error).message}`);
    }
    if ((i + 1) % 20 === 0) console.log(`  --- ${i + 1}/${targets.length} 진행 ---`);
    await sleep(400);
  }

  console.log(`\n===== ${dryRun ? "DRY-RUN 결과" : "수정 결과"} =====`);
  console.log(`${dryRun ? "수정 예정" : "수정 완료"} ${changed}건 / 건너뜀 ${skipped}건 / 실패 ${failed}건`);
  if (dryRun) console.log("\n실제로 반영하려면 --apply 를 붙여 다시 실행하세요.");
  else console.log(`원본 백업: ${path.relative(ROOT, BACKUP_DIR)}/`);
}

async function main(): Promise<void> {
  loadEnv();
  const [command, ...flags] = process.argv.slice(2);

  if (!isNaverCommerceConfigured()) {
    console.error(
      "NAVER_COMMERCE_CLIENT_ID / NAVER_COMMERCE_CLIENT_SECRET 가 없습니다.\n" +
        "커머스API센터(https://apicenter.commerce.naver.com)에서 애플리케이션을 등록하고\n" +
        "발급받은 값을 .env.local 또는 레일웨이 환경변수에 넣어주세요."
    );
    process.exitCode = 1;
    return;
  }

  switch (command) {
    case "audit":
      await cmdAudit();
      break;
    case "learn":
      await cmdLearn();
      break;
    case "apply":
      await cmdApply(!flags.includes("--apply"));
      break;
    default:
      console.log(
        "사용법:\n" +
          "  npx tsx scripts/naver/cli.ts audit          현황 조회 (읽기 전용)\n" +
          "  npx tsx scripts/naver/cli.ts learn          카테고리별 속성 템플릿 추출\n" +
          "  npx tsx scripts/naver/cli.ts apply          수정 시뮬레이션 (dry-run)\n" +
          "  npx tsx scripts/naver/cli.ts apply --apply  실제 수정"
      );
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
