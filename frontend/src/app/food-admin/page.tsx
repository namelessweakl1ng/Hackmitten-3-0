import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FoodScannerApp } from "@/components/admin/food-scanner";

export const dynamic = "force-dynamic";

export default async function FoodAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const role = (session.user as any)?.role;
  if (role !== "FOOD_ADMIN" && role !== "SUPER_ADMIN" && role !== "COORDINATOR") {
    redirect("/login");
  }
  return <FoodScannerApp />;
}
