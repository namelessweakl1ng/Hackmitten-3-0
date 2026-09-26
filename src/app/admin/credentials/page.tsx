import { AdminShell } from "@/components/admin/shell";
import { CredentialsManager } from "@/components/admin/credentials-manager";

export default async function AdminCredentialsPage() {
  return (
    <AdminShell>
      <CredentialsManager />
    </AdminShell>
  );
}
