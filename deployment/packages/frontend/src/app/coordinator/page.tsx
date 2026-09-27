import { RoleGate } from "@/components/auth/role-gate";
import { CoordinatorShell } from "@/components/coordinator/shell";
import { CoordinatorPortal } from "@/components/coordinator/portal";

export default async function CoordinatorPage() {
  return (
    <RoleGate roles={["COORDINATOR", "SUPER_ADMIN"]}>
    <CoordinatorShell>
      <CoordinatorPortal />
    </CoordinatorShell>
    </RoleGate>
  );
}
