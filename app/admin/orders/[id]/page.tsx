"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type OrderDetail = {
  id: string;
  stripe_session_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  packeta_point_id: string | null;
  packeta_shipment_id: string | null;
  items: unknown[];
  status: string;
  amount_total: number | null;
  created_at: string;
  updated_at: string;
};

type Timeline = {
  timestamp: string;
  event: string;
  description: string;
};

type Note = {
  id: string;
  note: string;
  created_at: string;
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [timeline, setTimeline] = useState<Timeline[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedOrder, setEditedOrder] = useState<Partial<OrderDetail>>({});

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load order");
      
      setOrder(json.order);
      setEditedOrder(json.order);
      
      // Generate timeline from order data
      const timelineEvents: Timeline[] = [
        {
          timestamp: json.order.created_at,
          event: "Order Created",
          description: `Order created with status: ${json.order.status}`
        }
      ];

      if (json.order.packeta_shipment_id) {
        timelineEvents.push({
          timestamp: json.order.updated_at,
          event: "Shipment Created",
          description: `Packeta shipment created: ${json.order.packeta_shipment_id}`
        });
      }

      setTimeline(timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      
      // Mock notes - in real app you'd fetch from database
      setNotes([]);
      
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [loadOrder, orderId]);

  const saveOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedOrder),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      
      setOrder(json.order);
      setEditMode(false);
      await loadOrder(); // Reload to get updated timeline
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    
    // In real app, save to database
    const note: Note = {
      id: Date.now().toString(),
      note: newNote,
      created_at: new Date().toISOString()
    };
    
    setNotes(prev => [note, ...prev]);
    setNewNote("");
    
    // Add to timeline
    setTimeline(prev => [{
      timestamp: note.created_at,
      event: "Note Added",
      description: newNote
    }, ...prev]);
  };

  const createPacketaShipment = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/packeta/create-shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create shipment");
      
      alert(`Zásilka vytvořena! Packeta ID: ${json.packetaId}`);
      await loadOrder(); // Reload to update data
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create shipment");
    } finally {
      setLoading(false);
    }
  };

  const printPacketaLabel = async () => {
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

  const getStatusColor = (status: string) => {
    const colors = {
      new: "bg-gray-100 text-gray-800",
      paid: "bg-green-100 text-green-800", 
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      cancelled: "bg-red-100 text-red-800",
      refunded: "bg-yellow-100 text-yellow-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (loading && !order) {
    return <div className="p-6">Loading...</div>;
  }

  if (!order) {
    return <div className="p-6">Order not found</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            ← Back
          </Button>
          <h1 className="text-2xl font-bold">Order Detail</h1>
          <Badge className={getStatusColor(order.status)}>
            {order.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          {order.packeta_point_id && order.status === "paid" && !order.packeta_shipment_id && (
            <Button onClick={createPacketaShipment} disabled={loading}>
              Create Shipment
            </Button>
          )}
          {order.packeta_shipment_id && (
            <Button variant="outline" onClick={printPacketaLabel}>
              Print Label
            </Button>
          )}
          {editMode ? (
            <>
              <Button onClick={saveOrder} disabled={loading}>Save</Button>
              <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
            </>
          ) : (
            <Button onClick={() => setEditMode(true)}>Edit</Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Order ID</label>
              <p className="text-sm break-all">{order.id}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium">Customer Name</label>
              {editMode ? (
                <Input
                  value={editedOrder.customer_name || ""}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, customer_name: e.target.value }))}
                />
              ) : (
                <p className="text-sm">{order.customer_name || "-"}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              {editMode ? (
                <Input
                  value={editedOrder.customer_email || ""}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, customer_email: e.target.value }))}
                />
              ) : (
                <p className="text-sm">{order.customer_email || "-"}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Phone</label>
              {editMode ? (
                <Input
                  value={editedOrder.customer_phone || ""}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, customer_phone: e.target.value }))}
                />
              ) : (
                <p className="text-sm">{order.customer_phone || "-"}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              {editMode ? (
                <select
                  className="w-full border rounded px-3 py-2"
                  value={editedOrder.status || ""}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, status: e.target.value }))}
                >
                  {["new", "paid", "processing", "shipped", "cancelled", "refunded"].map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              ) : (
                <Badge className={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Amount Total</label>
              <p className="text-sm">{order.amount_total ? `${order.amount_total} CZK` : "-"}</p>
            </div>

            <div>
              <label className="text-sm font-medium">Packeta Point ID</label>
              {editMode ? (
                <Input
                  value={editedOrder.packeta_point_id || ""}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, packeta_point_id: e.target.value }))}
                />
              ) : (
                <p className="text-sm">{order.packeta_point_id || "-"}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Packeta Shipment ID</label>
              <p className="text-sm">{order.packeta_shipment_id || "-"}</p>
            </div>

            <div>
              <label className="text-sm font-medium">Created</label>
              <p className="text-sm">{new Date(order.created_at).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            {order.items && Array.isArray(order.items) && order.items.length > 0 ? (
              <div className="space-y-3">
                {order.items.map((item: unknown, idx: number) => {
                  const typedItem = item as { name?: string; size?: string; color?: string; quantity?: number; price?: number };
                  return (
                    <div key={idx} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{typedItem.name || 'Unknown item'}</p>
                          {typedItem.size && <p className="text-sm text-gray-600">Size: {typedItem.size}</p>}
                          {typedItem.color && <p className="text-sm text-gray-600">Color: {typedItem.color}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">x{typedItem.quantity || 1}</p>
                          {typedItem.price && <p className="text-sm text-gray-600">{typedItem.price} CZK</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No items found</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeline.map((event, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                  <div>
                    <p className="font-medium">{event.event}</p>
                    <p className="text-sm text-gray-600">{event.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes & Communication */}
        <Card>
          <CardHeader>
            <CardTitle>Notes & Communication</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNote()}
                />
                <Button onClick={addNote}>Add</Button>
              </div>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {notes.map((note) => (
                  <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm">{note.note}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
                {notes.length === 0 && (
                  <p className="text-gray-500 text-sm">No notes yet</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}