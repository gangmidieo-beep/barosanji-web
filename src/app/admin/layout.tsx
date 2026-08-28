import Image from "next/image";
import "./dash.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex bg-gray-50 text-gray-900">
      <aside className="w-56 shrink-0 bg-white border-r border-gray-100 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-gray-100">
          <Image src="/brand/logo-lockup.png" alt="바로산지" width={169} height={53} className="h-7 w-auto" />
        </div>
        <nav className="flex-1 py-4 text-sm">
          {[
            { label: "대시보드", icon: "📊", active: true },
            { label: "주문 관리", icon: "📦" },
            { label: "상품 관리", icon: "🍎" },
            { label: "회원 관리", icon: "👥" },
            { label: "적립금 · 퀴즈 관리", icon: "🎯" },
            { label: "설정", icon: "⚙️" },
          ].map((m) => (
            <div
              key={m.label}
              className={`flex items-center gap-3 px-5 py-2.5 cursor-pointer ${
                m.active
                  ? "bg-brand-light text-brand-dark font-semibold border-r-2 border-brand"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </div>
          ))}
        </nav>
        <div className="p-4 text-[11px] text-gray-400 border-t border-gray-100">
          관리자: admin@farm-mall.example
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-end px-6">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>
              {new Date().toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </span>
            <span className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center">🙂</span>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
