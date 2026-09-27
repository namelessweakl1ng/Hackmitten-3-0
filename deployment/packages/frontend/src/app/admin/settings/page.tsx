import { AdminShell } from "@/components/admin/shell";
import { EventSettingsEditor } from "@/components/admin/event-settings-editor";

export default async function AdminSettingsPage() {
  return (
    <AdminShell>
      <EventSettingsEditor />
    </AdminShell>
  );
}
