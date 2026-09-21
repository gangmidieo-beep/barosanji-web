import { NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { products as productsTable } from "@/db/schema";

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

function isUrl(src: string) {
  return src.startsWith("http") || src.startsWith("/");
}

/** 공급사 사진이 실제로 열리는지 확인 (단종 상품 사진은 공급사가 지워버린 경우가 있다) */
async function isAlive(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-1023" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    res.body?.cancel().catch(() => {});
    const type = res.headers.get("content-type") ?? "";
    return res.ok && type.startsWith("image");
  } catch {
    return false;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const field = searchParams.get("field") === "detailImages" ? "detailImages" : "images";
  const index = Number(searchParams.get("index") ?? "0") || 0;

  // 상품 전체(무거운 base64)를 읽지 않고, 필요한 이미지 1장만 DB에서 뽑는다.
  const col = field === "detailImages" ? productsTable.detailImages : productsTable.images;
  const rows = await db
    .select({ src: sql<string | null>`(${col} ->> ${sql.raw(String(index))})` })
    .from(productsTable)
    .where(eq(productsTable.id, id))
    .limit(1);

  const src = rows[0]?.src;

  // 공급사 사진처럼 주소(URL)로 저장된 사진: 열리는 첫 번째 사진으로 넘겨준다.
  if (src && isUrl(src)) {
    const all = await db
      .select({ list: col })
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .limit(1);
    const urls = (all[0]?.list ?? []).filter(isUrl);
    const candidates = [src, ...urls.filter((u) => u !== src)];
    for (const cand of candidates) {
      if (cand.startsWith("/") || (await isAlive(cand))) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: new URL(cand, req.url).toString(),
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }
    return new Response("Not found", { status: 404 });
  }

  if (!src || !src.startsWith("data:")) return new Response("Not found", { status: 404 });

  const parsed = parseDataUrl(src);
  if (!parsed) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(parsed.buffer), {
    headers: {
      "Content-Type": parsed.mime,
      // 오래 캐시 → 재방문/스크롤 시 서버를 다시 안 거친다.
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
