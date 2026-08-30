import { NextRequest } from "next/server";
import { getVisibleProductById } from "@/lib/db-products";

/**
 * 상품 사진을 페이지 HTML 안에 통째로(base64) 넣지 않고, 이 API가 필요할 때마다 하나씩
 * 내려주기 위한 경로. 예: /api/product-image/p-123?field=images&index=0
 *
 * 사진을 여러 장 크게 올린 상품(예: 꽃게/새우처럼 사진이 많고 큰 상품)은 상세페이지의
 * HTML 용량이 너무 커져서, 브라우저가 화면을 다 그리기도 전에 느려지거나 일부 영역
 * (장바구니/구매 버튼, 오늘출발 타이머 등)이 아예 안 뜨는 원인이 될 수 있다. 사진을
 * 이 API를 통해 별도 요청으로 내려주면 페이지 자체는 가볍게 유지되고, 사진은 브라우저가
 * 알아서 병렬로/캐시하며 불러온다.
 */
export const dynamic = "force-dynamic";

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  try {
    return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const field = searchParams.get("field") === "detailImages" ? "detailImages" : "images";
  const index = Number(searchParams.get("index") ?? "0");

  const product = await getVisibleProductById(id);
  if (!product) return new Response("Not found", { status: 404 });

  const list = field === "detailImages" ? product.detailImages : product.images;
  const src = list?.[index];
  if (!src || !src.startsWith("data:")) return new Response("Not found", { status: 404 });

  const parsed = parseDataUrl(src);
  if (!parsed) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(parsed.buffer), {
    headers: {
      "Content-Type": parsed.mime,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
