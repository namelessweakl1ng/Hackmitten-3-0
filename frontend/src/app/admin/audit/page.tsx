import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";
import { AdminAuditLog } from "@/components/admin/audit-log";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const session = await getServerSession(authOptions);
  return (
    <AdminShell session={session}>
      <AdminAuditLog />
    </AdminShell>
  );
}
