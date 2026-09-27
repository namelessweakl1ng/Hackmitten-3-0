import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";
import { MealManager } from "@/components/admin/meal-manager";

export const dynamic = "force-dynamic";

export default async function AdminMealsPage() {
  const session = await getServerSession(authOptions);
  return (
    <AdminShell session={session}>
      <MealManager />
    </AdminShell>
  );
}
