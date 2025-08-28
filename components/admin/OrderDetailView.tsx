"use client";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, Truck, Edit, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

type OrderDetail = {
  id: string;
  stripe_session_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  packeta_point_id: string | null;
  packeta_shipment_id: string | null;
  packeta_tracking_url: string | null;
  items: string | unknown[];
  status: string;
  amount_total: number | null;
  created_at: string;
  updated_at: string;
};

type TimelineEvent = {
  timestamp: string;
  event: string;
  description: string;
  icon: React.ReactNode;
};



interface OrderDetailViewProps {
  orderId: string;
  onBack: () => void;
}

export default function OrderDetailView({ orderId, onBack }: OrderDetailViewProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedOrder, setEditedOrder] = useState<Partial<OrderDetail>>({});


  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: orderData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw new Error(error.message || "Failed to load order");

      setOrder(orderData);
      setEditedOrder(orderData);

      // Generate timeline from order data
      const timelineEvents: TimelineEvent[] = [
        {
          timestamp: orderData.created_at,
          event: "Order Created",
          description: `Order created with status: ${orderData.status}`,
          icon: <FileText className="w-4 h-4" />
        }
      ];

      if (orderData.packeta_shipment_id) {
        timelineEvents.push({
          timestamp: orderData.updated_at || orderData.created_at,
          event: "Shipment Created",
          description: `Packeta shipment created: ${orderData.packeta_shipment_id}`,
          icon: <Truck className="w-4 h-4" />
        });
      }

      setTimeline(timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const saveOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: updatedOrder, error } = await supabase
        .from('orders')
        .update(editedOrder)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw new Error(error.message || "Save failed");

      setOrder(updatedOrder);
      setEditMode(false);
      await loadOrder();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };



  const createPacketaShipment = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('packeta-create-shipment', {
        body: { orderId }
      });

      if (error) throw new Error(error.message || "Failed to create shipment");

      alert(`Zásilka vytvořena! Packeta ID: ${data.packetaId}`);
      await loadOrder();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create shipment");
    } finally {
      setLoading(false);
    }
  };

  const cancelPacketaShipment = async () => {
    if (!confirm("Opravdu zrušit Packeta zásilku?")) return;

    try {
      setLoading(true);
      const supabase = createClient();
      const { error } = await supabase.functions.invoke('packeta-cancel-shipment', {
        body: { orderId }
      });

      if (error) throw new Error(error.message || "Failed to cancel shipment");

      alert("Packeta zásilka úspěšně zrušena");
      await loadOrder();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to cancel shipment");
    } finally {
      setLoading(false);
    }
  };

  const printPacketaLabel = async () => {
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

  if (loading && !order) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Order not found</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </Button>
      </div>
    );
  }

  // Parse items
  let items: unknown[] = [];
  try {
    if (typeof order.items === 'string') {
      items = JSON.parse(order.items);
    } else if (Array.isArray(order.items)) {
      items = order.items;
    }
  } catch (e) {
    console.error('Failed to parse items:', e);
    items = [];
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order #{order.id.slice(-8)}</h1>
            <p className="text-gray-600">Created {new Date(order.created_at).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <Button
                onClick={saveOrder}
                disabled={loading}
                size="sm"
              >
                Save
              </Button>
              <Button
                onClick={() => setEditMode(false)}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setEditMode(true)}
              variant="outline"
              size="sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Order
            </Button>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit Packeta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Packeta Information</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Pickup Point ID</Label>
                  <Input
                    value={order.packeta_point_id || ""}
                    readOnly
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Shipment ID</Label>
                  <Input
                    value={order.packeta_shipment_id || ""}
                    readOnly
                    className="mt-1"
                  />
                </div>
                {order.packeta_point_id && order.status === "paid" && !order.packeta_shipment_id && (
                  <Button
                    onClick={createPacketaShipment}
                    disabled={loading}
                    className="w-full"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Create Shipment
                  </Button>
                )}
                {order.packeta_shipment_id && (
                  <div className="flex gap-2">
                    <Button
                      onClick={printPacketaLabel}
                      variant="outline"
                      className="flex-1"
                    >
                      Print Label
                    </Button>
                    <Button
                      onClick={cancelPacketaShipment}
                      variant="destructive"
                      className="flex-1"
                      disabled={loading}
                    >
                      Cancel Shipment
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Order Information */}
      <Card>
        <CardHeader>
          <CardTitle>Order Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Order ID</Label>
              <p className="text-sm font-mono text-blue-600 mt-1">{order.id}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Status</Label>
              {editMode ? (
                <Select
                  value={editedOrder.status || ""}
                  onValueChange={(value) => setEditedOrder(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["new", "paid", "processing", "shipped", "cancelled", "refunded"].map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge
                  className={`mt-1 ${
                    order.status === 'paid' ? 'bg-green-100 text-green-800' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  {order.status}
                </Badge>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label className="text-sm font-medium">Customer Name</Label>
              {editMode ? (
                <Input
                  value={editedOrder.customer_name || ""}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, customer_name: e.target.value }))}
                  className="mt-1"
                />
              ) : (
                <p className="text-sm mt-1">{order.customer_name || "-"}</p>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Email</Label>
              {editMode ? (
                <Input
                  type="email"
                  value={editedOrder.customer_email || ""}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, customer_email: e.target.value }))}
                  className="mt-1"
                />
              ) : (
                <p className="text-sm mt-1">{order.customer_email || "-"}</p>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Phone</Label>
              {editMode ? (
                <Input
                  value={editedOrder.customer_phone || ""}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, customer_phone: e.target.value }))}
                  className="mt-1"
                />
              ) : (
                <p className="text-sm mt-1">{order.customer_phone || "-"}</p>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Amount Total</Label>
              <p className="text-lg font-semibold mt-1">
                {order.amount_total ? `${(order.amount_total / 100).toFixed(2)} CZK` : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item: unknown, idx: number) => {
                const typedItem = item as {
                  description?: string;
                  name?: string;
                  size?: string;
                  quantity?: number;
                  price?: number;
                };
                const itemName = typedItem.description || typedItem.name || 'Unknown item';
                return (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{itemName}</p>
                      {typedItem.size && <p className="text-sm text-gray-600">Size: {typedItem.size}</p>}
                    </div>
                    <div className="text-right">
                      {typedItem.quantity && <p className="text-sm">Qty: {typedItem.quantity}</p>}
                      {typedItem.price && <p className="text-sm font-medium">{(typedItem.price / 100).toFixed(2)} CZK</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timeline.map((event, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                  <div>
                    <p className="font-medium text-sm">{event.event}</p>
                    <p className="text-xs text-gray-600">{event.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}


    </div>
  );
}