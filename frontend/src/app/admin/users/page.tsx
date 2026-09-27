import { AdminShell } from "@/components/admin/shell";
import { AdminUsersManager } from "@/components/admin/admin-users-manager";

export default async function AdminUsersPage() {
  return (
    <AdminShell>
      <AdminUsersManager />
    </AdminShell>
  );
}
