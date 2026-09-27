import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";
import { EventSettingsEditor } from "@/components/admin/event-settings-editor";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  return (
    <AdminShell session={session}>
      <EventSettingsEditor />
    </AdminShell>
  );
}
