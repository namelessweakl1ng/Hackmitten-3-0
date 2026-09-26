import { AdminShell } from "@/components/admin/shell";
import { ChangeHistoryViewer } from "@/components/admin/change-history-viewer";

export default async function AdminChangeHistoryPage() {
  return (
    <AdminShell>
      <ChangeHistoryViewer />
    </AdminShell>
  );
}
