import { NextRequest, NextResponse } from "next/server";
import {
  getOriginProduct,
  isNaverCommerceConfigured,
  searchProducts,
  sleep,
} from "@/lib/naver-commerce";
import { checkKeywords } from "@/lib/naver-keyword";

/**
 * 관리자 전용 — 스마트스토어 상품의 등록정보(브랜드·제조사·속성)와
 * 키워드(상품명·태그) 상태를 페이지 단위로 조회한다.
 *
 * 사용: /api/admin/naver/audit?page=1&size=20
 *
 * 208건을 한 번에 돌면 상품마다 원상품 조회를 한 번씩 해야 해서 요청이 너무 길어진다
 * (목록 API는 브랜드/속성/태그를 주지 않는다). 그래서 페이지로 나눠 받고,
 * 화면(/admin/naver)에서 페이지를 이어가며 진행률을 보여준다.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/** 한 번에 처리할 최대 건수 — 너무 키우면 요청이 타임아웃된다 */
const MAX_SIZE = 25;

export async function GET(req: NextRequest) {
  if (!isNaverCommerceConfigured()) {
    return NextResponse.json(
      { ok: false, errorMessage: "커머스API 자격증명이 설정되어 있지 않습니다. /api/admin/naver/check 를 먼저 확인하세요." },
      { status: 400 }
    );
  }

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
  const size = Math.min(MAX_SIZE, Math.max(1, Number(req.nextUrl.searchParams.get("size") ?? 20)));

  try {
    const list = await searchProducts({ page, size });
    const total = list.totalElements ?? 0;
    const rows = [];

    for (const item of list.contents ?? []) {
      const channel = item.channelProducts?.[0];
      try {
        const envelope = await getOriginProduct(item.originProductNo);
        const origin = envelope.originProduct;
        const detail = origin?.detailAttribute ?? {};
        const info = detail.naverShoppingSearchInfo;
        const tags = (detail.seoInfo?.sellerTags ?? []).map((t) => t.text).filter(Boolean);
        const name = origin?.name ?? channel?.name ?? "";
        const categoryName = channel?.wholeCategoryName ?? "";

        rows.push({
          originProductNo: item.originProductNo,
          name,
          categoryId: origin?.leafCategoryId ?? channel?.categoryId ?? "",
          categoryName,
          brandName: info?.brandName ?? "",
          manufacturerName: info?.manufacturerName ?? "",
          attributeCount: detail.productAttributes?.length ?? 0,
          catalogMatched: info?.catalogMatchingYn === true,
          tags,
          // 키워드 가이드 위반 여부까지 여기서 같이 판정해서 내려준다
          keywordIssues: checkKeywords({ name, tags, categoryName }),
        });
      } catch (err) {
        rows.push({
          originProductNo: item.originProductNo,
          name: channel?.name ?? "",
          error: err instanceof Error ? err.message : String(err),
        });
      }
      await sleep(150); // 커머스API 호출 제한 여유
    }

    const done = (page - 1) * size + (list.contents?.length ?? 0);
    return NextResponse.json({
      ok: true,
      page,
      size,
      total,
      진행: `${Math.min(done, total)}/${total}`,
      hasMore: done < total && (list.contents?.length ?? 0) > 0,
      rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        errorMessage: message,
        힌트: /IP|허용되지/i.test(message)
          ? "이 서버의 IP가 커머스API센터에 등록되어 있지 않습니다. /api/admin/naver/check 로 IP를 확인하세요."
          : undefined,
      },
      { status: 502 }
    );
  }
}
