import { AdminShell } from "@/components/admin/shell";
import { AdminDashboardHome } from "@/components/admin/dashboard-home";

export default async function AdminPage() {
  return (
    <AdminShell>
      <AdminDashboardHome />
    </AdminShell>
  );
}
