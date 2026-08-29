import Link from "next/link";
import { categories, getProductsByCategory, products } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import CountdownTimer from "@/components/CountdownTimer";
import QuizTeaser from "@/components/QuizTeaser";
import SeasonalPicks from "@/components/SeasonalPicks";
import HomeCarousel from "@/components/HomeCarousel";
import InstallPrompt from "@/components/InstallPrompt";

export default function Home() {
  const timeSale = getProductsByCategory("time-sale");
  const direct = getProductsByCategory("direct");
  const popular = [...products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 8);

  return (
    <div>
      <HomeCarousel />

      <InstallPrompt />

      <SeasonalPicks />

      <QuizTeaser />

      {/* category quick icons */}
      <section className="px-4 py-6">
        <div className="grid grid-cols-4 gap-y-4 text-center">
          {categories.map((c, i) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="flex flex-col items-center gap-1.5 group animate-pop-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-brand-light to-emerald-100 flex items-center justify-center text-xl shadow-sm group-active:scale-90 transition-transform">
                {c.icon}
              </span>
              <span className="text-[11px] text-gray-700 font-medium">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* time sale */}
      <section className="px-4 py-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold flex items-center gap-1.5">
            <span className="text-accent">⏰ 타임특가</span>
            <span className="text-xs font-normal text-gray-400">오늘만 이 가격!</span>
          </h2>
          <CountdownTimer />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {timeSale.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <Link
          href="/category/time-sale"
          className="block text-center text-xs text-gray-500 mt-3"
        >
          타임특가 더보기 &gt;
        </Link>
      </section>

      {/* direct shipping */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-6">
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-brand-dark">🚚 농가에서 바로, 산지직송</h2>
            <Link href="/category/direct" className="text-xs text-gray-500">
              더보기 &gt;
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {direct.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* popular */}
      <section className="px-4 py-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold flex items-center gap-1.5">
            <span>🔥 인기 먹거리</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {popular.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
