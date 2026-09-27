import { RoleGate } from "@/components/auth/role-gate";
import { FoodScannerApp } from "@/components/admin/food-scanner";

export default async function FoodAdminPage() {
  return <RoleGate roles={["FOOD_ADMIN", "SUPER_ADMIN", "COORDINATOR"]}><FoodScannerApp /></RoleGate>;
}
