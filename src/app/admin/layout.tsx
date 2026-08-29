import AdminSidebar from "@/components/admin/AdminSidebar";
import "./dash.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex bg-gray-50 text-gray-900">
      <AdminSidebar />
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
