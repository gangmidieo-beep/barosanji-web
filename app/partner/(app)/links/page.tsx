import { requirePartner } from "@/lib/partner-session";
import { getPartnerProducts, listPartnerLinks } from "@/lib/db-partner";
import LinksClient from "@/components/partner/LinksClient";

export const dynamic = "force-dynamic";

export default async function PartnerLinksPage() {
  const partner = await requirePartner();
  const [productsRaw, linksRaw] = await Promise.all([getPartnerProducts(), listPartnerLinks(partner.id)]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const existingByProduct: Record<string, string> = {};
  for (const l of linksRaw) if (l.productId) existingByProduct[l.productId] = l.code;

  const products = productsRaw.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    reward: Math.round(p.price * p.commissionRate),
    code: existingByProduct[p.id] ?? null,
  }));

  return (
    <div className="px-4">
      <div className="text-[15px] font-black text-[#ff7a1a] mb-1">🛍 상품별 추천 링크</div>
      <p className="text-xs text-gray-500 mb-3">상품을 고르면 나만의 링크가 만들어져요. 그 링크로 팔리면 아래 수익이 내 거예요!</p>
      <LinksClient products={products} siteUrl={siteUrl} />
    </div>
  );
}
