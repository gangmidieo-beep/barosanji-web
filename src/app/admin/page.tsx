import DashBoard from "@/components/admin/DashBoard";
import { buildDashboardData } from "@/lib/dashboard-data";

export default function AdminDashboard() {
  const data = buildDashboardData(0);
  return <DashBoard data={data} />;
}
