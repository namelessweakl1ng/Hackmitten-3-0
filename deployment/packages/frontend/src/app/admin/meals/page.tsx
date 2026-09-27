import { AdminShell } from "@/components/admin/shell";
import { MealManager } from "@/components/admin/meal-manager";

export default async function AdminMealsPage() {
  return (
    <AdminShell>
      <MealManager />
    </AdminShell>
  );
}
