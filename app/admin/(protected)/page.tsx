import DashBoard from "@/components/admin/DashBoard";
import { buildDashboardData } from "@/lib/dashboard-data";
import { countAllProducts } from "@/lib/db-products";

// 실제 상품 개수를 DB에서 매번 새로 세야 하므로 캐시하지 않음
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const productCount = await countAllProducts();
  const data = buildDashboardData(productCount);
  return <DashBoard data={data} />;
}
