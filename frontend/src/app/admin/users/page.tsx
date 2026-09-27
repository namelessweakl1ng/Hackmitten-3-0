import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";
import { AdminUsersManager } from "@/components/admin/admin-users-manager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  return (
    <AdminShell session={session}>
      <AdminUsersManager />
    </AdminShell>
  );
}
