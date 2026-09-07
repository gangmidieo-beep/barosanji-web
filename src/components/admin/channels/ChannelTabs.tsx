"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/channels", label: "수익 대시보드" },
  { href: "/admin/channels/orders", label: "채널 주문" },
  { href: "/admin/channels/fees", label: "수수료 · 채널 설정" },
  { href: "/admin/channels/costs", label: "상품 원가" },
  { href: "/admin/channels/pricing", label: "가격 관리" },
  { href: "/admin/channels/ads", label: "광고비" },
];

export default function ChannelTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 mb-5 border-b border-gray-200 overflow-x-auto">
      {TABS.map((t) => {
        const active = t.href === "/admin/channels" ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition ${
              active ? "border-brand text-brand-dark font-semibold" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
