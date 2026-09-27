import { AdminShell } from "@/components/admin/shell";
import { FoodDashboard } from "@/components/admin/food-dashboard";

export default async function AdminFoodPage() {
  return (
    <AdminShell>
      <FoodDashboard />
    </AdminShell>
  );
}
