"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatOrderId } from "@/lib/product-images";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  stripe_session_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  packeta_point_id: string | null;
  packeta_shipment_id: string | null;
  items: string | unknown[]; // Can be JSON string or array
  status: string;
  amount_total: number | null;
  created_at: string;
};

interface OrdersTableProps {
  onOrderClick?: (orderId: string) => void;
}

export default function OrdersTable({ onOrderClick }: OrdersTableProps = {}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newOrder, setNewOrder] = useState<Partial<Order>>({
    customer_email: "",
    customer_name: "",
    customer_phone: "",
    packeta_point_id: "",
    amount_total: undefined,
    status: "new",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      // Try to get user info first
      const { data: userData } = await supabase.auth.getUser();
      console.log('Current user:', userData.user);

      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Orders data:', ordersData);
      console.log('Orders error:', error);
      console.log('Number of orders:', ordersData?.length || 0);

      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
      }

      setOrders(ordersData || []);
    } catch (e: unknown) {
      console.error('Load orders error:', e);
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('orders')
        .insert([newOrder]);

      if (error) throw new Error(error.message || "Create failed");
      setNewOrder({ customer_email: "", customer_name: "", customer_phone: "", packeta_point_id: "", amount_total: undefined, status: "new" });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id);

      if (error) throw new Error(error.message || "Update failed");
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));

      // Show success message
      const order = orders.find(o => o.id === id);
      if (order?.customer_email) {
        console.log(`✅ Status updated for ${order.customer_email}`);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Update failed");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Smazat objednávku?")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message || "Delete failed");
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Delete failed");
    }
  };

  const createPacketaShipment = async (orderId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('packeta-create-shipment', {
        body: { orderId }
      });

      if (error) throw new Error(error.message || "Failed to create shipment");

      // Update order status to shipped
      await updateStatus(orderId, "shipped");
      alert(`Zásilka vytvořena! Packeta ID: ${data.packetaId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create shipment");
    } finally {
      setLoading(false);
    }
  };

  const checkAllPacketaStatuses = async () => {
    if (!confirm("Zkontrolovat stavy všech aktivních Packeta zásilek? Toto může chvíli trvat.")) return;

    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('packeta-status-check');

      if (error) throw new Error(error.message || "Status check failed");

      alert(`✅ Zkontrolováno: ${data.checked} zásilek, aktualizováno: ${data.updated} objednávek`);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Status check failed");
    } finally {
      setLoading(false);
    }
  };

  const bulkCancelPacketaShipments = async () => {
    if (!confirm("Opravdu zrušit VŠECHNY staré Packeta zásilky? Tím se zruší všechny nevyřízené zásilky jak v Packeta systému, tak v databázi.")) return;

    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('packeta-bulk-cancel');

      if (error) throw new Error(error.message || "Bulk cancel failed");

      alert(`✅ Úspěšně zpracováno: ${data.database_reset} objednávek resetováno, ${data.cancelled || 0} zásilek zrušeno v Packeta API`);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bulk cancel failed");
    } finally {
      setLoading(false);
    }
  };

  const printPacketaLabel = async (orderId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('packeta-print-label', {
        body: { orderId }
      });

      if (error) throw new Error(error.message || "Failed to get label");

      // Assuming the function returns a blob or URL
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `packeta-label-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to print label");
    }
  };

  const statuses = useMemo(
    () => ["new", "paid", "processing", "shipped", "cancelled", "refunded"],
    []
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Debug info */}
      <div className="bg-gray-100 p-4 rounded-lg text-sm">
        <h3 className="font-semibold mb-2">Debug Info:</h3>
        <p>Loading: {loading ? 'Yes' : 'No'}</p>
        <p>Orders count: {orders.length}</p>
        <p>Error: {error || 'None'}</p>
        {orders.length > 0 && (
          <div className="mt-2">
            <p>Sample order IDs: {orders.slice(0, 3).map(o => o.id).join(', ')}</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Create order (manual)</h2>
        <div className="flex gap-2 flex-wrap items-end">
          <div>
            <label className="text-sm">Email</label>
            <Input
              value={newOrder.customer_email as string}
              onChange={(e) => setNewOrder((s) => ({ ...s, customer_email: e.target.value }))}
              placeholder="customer@example.com"
            />
          </div>
          <div>
            <label className="text-sm">Name</label>
            <Input
              value={newOrder.customer_name as string}
              onChange={(e) => setNewOrder((s) => ({ ...s, customer_name: e.target.value }))}
              placeholder="Name"
            />
          </div>
          <div>
            <label className="text-sm">Phone</label>
            <Input
              value={newOrder.customer_phone as string}
              onChange={(e) => setNewOrder((s) => ({ ...s, customer_phone: e.target.value }))}
              placeholder="+420..."
            />
          </div>
          <div>
            <label className="text-sm">Packeta point ID</label>
            <Input
              value={newOrder.packeta_point_id as string}
              onChange={(e) => setNewOrder((s) => ({ ...s, packeta_point_id: e.target.value }))}
              placeholder="Z-POINT-ID"
            />
          </div>
          <div>
            <label className="text-sm">Amount total (CZK)</label>
            <Input
              type="number"
              value={newOrder.amount_total !== undefined ? String(newOrder.amount_total) : ""}
              onChange={(e) =>
                setNewOrder((s) => ({
                  ...s,
                  amount_total: e.target.value === "" ? undefined : Number(e.target.value),
                }))
              }
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-sm">Status</label>
            <select
              className="border rounded px-2 py-2 h-10"
              value={newOrder.status as string}
              onChange={(e) => setNewOrder((s) => ({ ...s, status: e.target.value }))}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={onCreate} disabled={loading}>
            Create
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Bulk Cancel Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 mb-2">🗑️ Bulk Cancel Old Packeta Shipments</h3>
        <p className="text-sm text-yellow-700 mb-3">
          Zruší všechny nevyřízené Packeta zásilky (status != shipped) jak v API, tak v databázi
        </p>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={bulkCancelPacketaShipments} 
            disabled={loading}
            className="border-yellow-400 text-yellow-800 hover:bg-yellow-100"
          >
            Cancel All Old Shipments
          </Button>
          <Button 
            variant="outline" 
            onClick={checkAllPacketaStatuses} 
            disabled={loading}
            className="border-blue-400 text-blue-800 hover:bg-blue-100"
          >
            🔄 Check All Statuses
          </Button>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Packeta</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => {
              // Parse items from JSON string if needed
              let items: unknown[] = [];
              try {
                if (typeof o.items === 'string') {
                  items = JSON.parse(o.items);
                } else if (Array.isArray(o.items)) {
                  items = o.items;
                }
              } catch (e) {
                console.error('Failed to parse items:', e);
                items = [];
              }
              
              return (
                <TableRow
                  key={o.id}
                  className="hover:bg-blue-50 cursor-pointer"
                  onClick={() => onOrderClick?.(o.id)}
                >
                  <TableCell className="align-top max-w-[260px]">
                    <div className="font-mono font-bold text-blue-600">{formatOrderId(o.id)}</div>
                    <div className="text-xs text-gray-500 break-all">{o.id}</div>
                  </TableCell>
                  <TableCell className="align-top max-w-[200px]">
                    {items.length > 0 ? (
                      <div className="text-xs">
                        {items.map((item: unknown, idx: number) => {
                          const typedItem = item as { description?: string; name?: string; size?: string; quantity?: number };
                          const itemName = typedItem.description || typedItem.name || 'Unknown item';
                          return (
                            <div key={idx} className="mb-1">
                              {itemName}
                              {typedItem.size && <span className="text-gray-500"> ({typedItem.size})</span>}
                              {typedItem.quantity && <span className="text-blue-600"> x{typedItem.quantity}</span>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No items</span>
                    )}
                  </TableCell>
                  <TableCell className="align-top">{o.customer_email}</TableCell>
                  <TableCell className="align-top">{o.customer_name}</TableCell>
                  <TableCell className="align-top">{o.customer_phone}</TableCell>
                  <TableCell className="align-top">
                    <div className="text-xs">
                      {o.packeta_point_id && <div>Point: {o.packeta_point_id}</div>}
                      {o.packeta_shipment_id && <div className="text-blue-600">Ship: {o.packeta_shipment_id}</div>}
                    </div>
                  </TableCell>
                 <TableCell className="align-top" onClick={(e) => e.stopPropagation()}>
                   <Badge
                     variant={
                       o.status === 'paid' ? 'default' :
                       o.status === 'shipped' ? 'secondary' :
                       o.status === 'cancelled' ? 'destructive' :
                       'outline'
                     }
                   >
                     {o.status}
                   </Badge>
                  </TableCell>
                  <TableCell className="align-top">
                    {o.amount_total ? `${(o.amount_total / 100).toFixed(2)} CZK` : '-'}
                  </TableCell>
                  <TableCell className="align-top" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 flex-wrap">
                     {o.packeta_point_id && o.status === "paid" && !o.packeta_shipment_id && (
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={() => createPacketaShipment(o.id)}
                         disabled={loading}
                       >
                         Create Shipment
                       </Button>
                     )}
                     {o.packeta_shipment_id && (
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={() => printPacketaLabel(o.id)}
                         disabled={loading}
                       >
                         Print Label
                       </Button>
                     )}
                     <Button
                       size="sm"
                       variant="destructive"
                       onClick={() => onDelete(o.id)}
                       disabled={loading}
                     >
                       Delete
                     </Button>
                   </div>
                 </TableCell>
                 </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
