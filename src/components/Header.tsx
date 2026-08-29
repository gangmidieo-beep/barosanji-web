"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { categories } from "@/lib/data";

export default function Header() {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-white">
      {/* top bar */}
      <div className="flex items-center gap-3 px-4 h-14">
        {searchOpen ? (
          <form onSubmit={submitSearch} className="flex-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="닫기"
              className="text-xl text-gray-500 shrink-0"
            >
              ←
            </button>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="농가, 상품, 산지를 검색해보세요"
              className="flex-1 border border-brand rounded-full px-4 py-1.5 text-sm outline-none"
            />
            <button type="submit" className="text-brand-dark font-semibold text-sm shrink-0">
              검색
            </button>
          </form>
        ) : (
          <>
            <Link href="/" className="flex items-center shrink-0">
              <Image
                src="/brand/logo-lockup.png"
                alt="바로산지"
                width={169}
                height={53}
                priority
                className="h-7 w-auto"
              />
            </Link>
            <div className="flex-1" />
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="검색"
              className="text-xl text-gray-600"
            >
              🔍
            </button>
            <Link href="/board" aria-label="고객센터" className="text-xl text-gray-600">
              💬
            </Link>
          </>
        )}
      </div>

      {/* category chip scroll */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-2.5 text-sm">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className="whitespace-nowrap flex items-center gap-1 px-3 py-1.5 rounded-full bg-brand-light text-brand-dark font-medium"
          >
            <span>{c.icon}</span>
            <span>{c.name}</span>
          </Link>
        ))}
      </div>
    </header>
  );
}
