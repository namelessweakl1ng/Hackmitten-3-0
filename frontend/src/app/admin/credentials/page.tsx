import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";
import { CredentialsManager } from "@/components/admin/credentials-manager";

export const dynamic = "force-dynamic";

export default async function AdminCredentialsPage() {
  const session = await getServerSession(authOptions);
  return (
    <AdminShell session={session}>
      <CredentialsManager />
    </AdminShell>
  );
}
