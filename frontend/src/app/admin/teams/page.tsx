import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";
import { TeamManager } from "@/components/admin/team-manager";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const session = await getServerSession(authOptions);
  return (
    <AdminShell session={session}>
      <TeamManager />
    </AdminShell>
  );
}
