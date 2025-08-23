"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Order = {
  id: string;
  stripe_session_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  packeta_point_id: string | null;
  items: unknown[];
  status: string;
  amount_total: number | null;
  created_at: string;
};

export default function OrdersTable() {
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
      const res = await fetch("/api/admin/orders");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setOrders(json.orders);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
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
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Create failed");
      setNewOrder({ customer_email: "", customer_name: "", customer_phone: "", packeta_point_id: "", amount_total: undefined, status: "new" });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Update failed");
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const onDelete = async (id: string) => {
    if (!confirm("Smazat objednávku?")) return;
    const res = await fetch(`/api/admin/orders/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Delete failed");
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const createPacketaShipment = async (orderId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/packeta/create-shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create shipment");
      
      // Update order status to shipped
      await updateStatus(orderId, "shipped");
      alert(`Zásilka vytvořena! Packeta ID: ${json.packetaId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create shipment");
    } finally {
      setLoading(false);
    }
  };

  const printPacketaLabel = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/packeta/print-label/${orderId}`, {
        method: "GET",
      });
      if (!res.ok) throw new Error("Failed to get label");
      
      const blob = await res.blob();
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

      <div className="overflow-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Items</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Phone</th>
              <th className="p-2 border">Packeta</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Created</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              // Parse items from JSON
              const items = Array.isArray(o.items) ? o.items : [];
              
              return (
                <tr key={o.id} className="odd:bg-background even:bg-muted/30">
                  <td className="p-2 border align-top max-w-[260px] break-all">{o.id}</td>
                  <td className="p-2 border align-top max-w-[200px]">
                    {items.length > 0 ? (
                      <div className="text-xs">
                        {items.map((item: unknown, idx: number) => {
                          const typedItem = item as { name?: string; size?: string; quantity?: number };
                          return (
                            <div key={idx} className="mb-1">
                              {typedItem.name || 'Unknown item'} 
                              {typedItem.size && <span className="text-gray-500"> ({typedItem.size})</span>}
                              {typedItem.quantity && <span className="text-blue-600"> x{typedItem.quantity}</span>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No items</span>
                    )}
                  </td>
                  <td className="p-2 border align-top">{o.customer_email}</td>
                  <td className="p-2 border align-top">{o.customer_name}</td>
                  <td className="p-2 border align-top">{o.customer_phone}</td>
                  <td className="p-2 border align-top">{o.packeta_point_id}</td>
                <td className="p-2 border align-top">
                  <select
                    className="border rounded px-2 py-1"
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2 border align-top">{o.amount_total ?? "-"}</td>
                <td className="p-2 border align-top">
                  {new Date(o.created_at).toLocaleString()}
                </td>
                <td className="p-2 border align-top whitespace-nowrap">
                  <div className="flex gap-1 flex-col">
                    {o.packeta_point_id && o.status === "paid" && (
                      <Button 
                        variant="default" 
                        onClick={() => createPacketaShipment(o.id)} 
                        size="sm"
                        disabled={loading}
                      >
                        Create Shipment
                      </Button>
                    )}
                    {o.status === "shipped" && (
                      <Button 
                        variant="outline" 
                        onClick={() => printPacketaLabel(o.id)} 
                        size="sm"
                      >
                        Print Label
                      </Button>
                    )}
                    <Button variant="destructive" onClick={() => onDelete(o.id)} size="sm">
                      Delete
                    </Button>
                  </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
