import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CoordinatorShell } from "@/components/coordinator/shell";
import { CoordinatorPortal } from "@/components/coordinator/portal";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CoordinatorPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const role = (session.user as any)?.role;
  if (role !== "COORDINATOR" && role !== "SUPER_ADMIN") {
    redirect("/login");
  }
  return (
    <CoordinatorShell session={session}>
      <CoordinatorPortal />
    </CoordinatorShell>
  );
}
