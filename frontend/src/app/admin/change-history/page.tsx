import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";
import { ChangeHistoryViewer } from "@/components/admin/change-history-viewer";

export const dynamic = "force-dynamic";

export default async function AdminChangeHistoryPage() {
  const session = await getServerSession(authOptions);
  return (
    <AdminShell session={session}>
      <ChangeHistoryViewer />
    </AdminShell>
  );
}
