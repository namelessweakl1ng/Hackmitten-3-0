import { AdminShell } from "@/components/admin/shell";
import { AdminAuditLog } from "@/components/admin/audit-log";

export default async function AdminAuditPage() {
  return (
    <AdminShell>
      <AdminAuditLog />
    </AdminShell>
  );
}
