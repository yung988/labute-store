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
  items: any;
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
    } catch (e: any) {
      setError(e.message);
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
    } catch (e: any) {
      setError(e.message);
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
              value={newOrder.amount_total as any}
              onChange={(e) => setNewOrder((s) => ({ ...s, amount_total: Number(e.target.value) || undefined }))}
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
            {orders.map((o) => (
              <tr key={o.id} className="odd:bg-background even:bg-muted/30">
                <td className="p-2 border align-top max-w-[260px] break-all">{o.id}</td>
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
                  <Button variant="destructive" onClick={() => onDelete(o.id)} size="sm">
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
