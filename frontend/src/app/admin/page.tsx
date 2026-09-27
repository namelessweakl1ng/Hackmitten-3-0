import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";
import { AdminDashboardHome } from "@/components/admin/dashboard-home";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  return (
    <AdminShell session={session}>
      <AdminDashboardHome />
    </AdminShell>
  );
}
