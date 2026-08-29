import Link from "next/link";

/**
 * 9~10월(가을철) 검색량·수요가 가장 높은 제철 식품 TOP5 배너.
 * 실제 해당 상품이 카탈로그에 등록되기 전까지는 관련 카테고리로 연결되는
 * 안내용 태그로 노출된다. 상품이 등록되면 href를 해당 상품 상세로 바꿔주면 된다.
 */
const SEASONAL_PICKS = [
  { emoji: "🍎", name: "햇사과", href: "/category/fruit" },
  { emoji: "🐟", name: "가을 전어", href: "/category/fish" },
  { emoji: "🦐", name: "가을 대하", href: "/category/fish" },
  { emoji: "🦀", name: "가을 꽃게", href: "/category/fish" },
  { emoji: "🍠", name: "햇고구마", href: "/category/vegetable" },
];

export default function SeasonalPicks() {
  return (
    <section className="px-4 pt-4">
      <div className="rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-100 px-4 py-3.5">
        <p className="text-sm font-bold text-gray-900 mb-2.5">
          🍂 9~10월, 지금 가장 많이 찾는 제철 TOP5
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {SEASONAL_PICKS.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="card-tap flex flex-col items-center gap-1 text-center"
            >
              <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-xl shadow-sm">
                {item.emoji}
              </span>
              <span className="text-[10.5px] text-gray-700 font-medium leading-tight">
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
