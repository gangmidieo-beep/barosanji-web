import DashBoard from "@/components/admin/DashBoard";
import { buildDashboardData, type MockOrder } from "@/lib/dashboard-data";
import { countAllProducts } from "@/lib/db-products";
import { getDashboardStats, listAdminOrders } from "@/lib/db-orders";

// 매출/주문 숫자를 매번 실제 DB에서 새로 집계하므로 캐시하지 않음
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [productCount, stats, adminOrders] = await Promise.all([
    countAllProducts(),
    getDashboardStats(),
    listAdminOrders(),
  ]);

  // 대시보드 하단 "최근 주문" 미리보기 (주문 관리 목록에서 상위 8건만)
  const recentOrders: MockOrder[] = adminOrders.slice(0, 8).map((o) => ({
    orderNo: o.orderNo,
    buyer: o.buyer,
    dateLabel: o.dateLabel,
    status: o.status,
    amount: o.amount,
    productName: o.productName,
    supplierName: o.supplierName,
  }));

  const data = buildDashboardData(productCount, stats, recentOrders);
  return <DashBoard data={data} />;
}
