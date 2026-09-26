import { AdminShell } from "@/components/admin/shell";
import { AdminRegistrationDetail } from "@/components/admin/registration-detail";

export default async function AdminRegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell>
      <AdminRegistrationDetail id={id} />
    </AdminShell>
  );
}
