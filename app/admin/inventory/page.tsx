import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InventoryTable from "@/components/admin/InventoryTable";

export default async function InventoryPage() {
  const supabase = await createClient();

  const { data: user, error } = await supabase.auth.getUser();
  if (error || !user?.user) {
    redirect("/auth/login");
  }

  // Check user role
  const userRole = user.user.user_metadata?.role || user.user.app_metadata?.role;
  if (!userRole || !['shopmanager', 'superadmin'].includes(userRole)) {
    redirect("/auth/error?message=Unauthorized access");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div>
        <h2 className="font-bold text-2xl mb-4">Inventory Management</h2>
        <InventoryTable />
      </div>
    </div>
  );
}