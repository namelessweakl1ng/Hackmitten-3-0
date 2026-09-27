import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";
import { AdminRegistrationDetail } from "@/components/admin/registration-detail";

export const dynamic = "force-dynamic";

export default async function AdminRegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  return (
    <AdminShell session={session}>
      <AdminRegistrationDetail id={id} />
    </AdminShell>
  );
}
