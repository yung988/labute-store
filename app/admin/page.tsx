import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { InfoIcon } from "lucide-react";
import OrdersTable from "@/components/admin/OrdersTable";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          This is an admin-only page. You must be authenticated to view it.
        </div>
      </div>
      <div>
        <h2 className="font-bold text-2xl mb-4">Orders</h2>
        <OrdersTable />
      </div>
    </div>
  );
}
