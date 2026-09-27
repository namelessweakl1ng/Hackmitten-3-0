import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";
import { FoodDashboard } from "@/components/admin/food-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminFoodPage() {
  const session = await getServerSession(authOptions);
  return (
    <AdminShell session={session}>
      <FoodDashboard />
    </AdminShell>
  );
}
