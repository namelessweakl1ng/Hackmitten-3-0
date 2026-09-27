import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";
import { AdminRegistrationsList } from "@/components/admin/registrations-list";

export const dynamic = "force-dynamic";

export default async function AdminRegistrationsPage() {
  const session = await getServerSession(authOptions);
  return (
    <AdminShell session={session}>
      <AdminRegistrationsList />
    </AdminShell>
  );
}
