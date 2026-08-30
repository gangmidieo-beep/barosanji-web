import DashBoard from "@/components/admin/DashBoard";
import { buildDashboardData } from "@/lib/dashboard-data";

export default function AdminDashboard() {
  const data = buildDashboardData();
  return <DashBoard data={data} />;
}
