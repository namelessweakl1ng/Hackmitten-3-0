import { AdminShell } from "@/components/admin/shell";
import { TeamManager } from "@/components/admin/team-manager";

export default async function AdminTeamsPage() {
  return (
    <AdminShell>
      <TeamManager />
    </AdminShell>
  );
}
