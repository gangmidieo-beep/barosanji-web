"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

const MENU = [
  { label: "대시보드", icon: "📊", href: "/admin" },
  { label: "주문 관리", icon: "📦", href: "/admin/orders" },
  { label: "상품 관리", icon: "🍎", href: "/admin/products" },
  { label: "회원 관리", icon: "👥", href: "/admin/users" },
  { label: "적립금 · 퀴즈 관리", icon: "🎯", href: "/admin/points" },
  { label: "설정", icon: "⚙️", href: "/admin/settings" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-100 hidden md:flex flex-col">
      <div className="h-16 flex items-center px-5 border-b border-gray-100">
        <Link href="/admin">
          <Image src="/brand/logo-lockup.png" alt="바로산지" width={169} height={53} className="h-7 w-auto" />
        </Link>
      </div>
      <div className="px-4 pt-4 pb-1">
        
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-brand-dark bg-brand-light hover:bg-brand-light/70 rounded-full py-2 transition"
        >
          🔗 내 사이트 바로가기
        </a>
      </div>
      <nav className="flex-1 py-4 text-sm">
        {MENU.map((m) => {
          const active = m.href === "/admin" ? pathname === "/admin" : pathname.startsWith(m.href);
          return (
            <Link
              key={m.href}
              href={m.href}
              className={`flex items-center gap-3 px-5 py-2.5 ${
                active
                  ? "bg-brand-light text-brand-dark font-semibold border-r-2 border-brand"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 mb-2">관리자: admin@farm-mall.example</p>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-red-500 font-medium"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
