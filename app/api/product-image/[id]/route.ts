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
