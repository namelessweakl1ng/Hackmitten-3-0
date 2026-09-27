import { AdminShell } from "@/components/admin/shell";
import { AdminRegistrationsList } from "@/components/admin/registrations-list";

export default async function AdminRegistrationsPage() {
  return (
    <AdminShell>
      <AdminRegistrationsList />
    </AdminShell>
  );
}
