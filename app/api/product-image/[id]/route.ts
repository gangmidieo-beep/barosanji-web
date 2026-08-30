import { NextRequest } from "next/server";
import { getVisibleProductById } from "@/lib/db-products";

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
