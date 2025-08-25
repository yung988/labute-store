"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProductImage, formatOrderId } from "@/lib/product-images";

type OrderDetail = {
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
          timestamp: json.order.updated_at || json.order.created_at,
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

  const cancelPacketaShipment = async () => {
    if (!confirm("Opravdu zrušit Packeta zásilku?")) return;
    
    try {
      setLoading(true);
      // Reset packeta fields
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          packeta_shipment_id: null,
          status: "paid" 
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to cancel shipment");
      
      alert("Packeta zásilka zrušena");
      await loadOrder();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to cancel shipment");
    } finally {
      setLoading(false);
    }
  };

  const resendOrderEmail = async (type: 'receipt' | 'status') => {
    if (!order?.customer_email) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/orders/${orderId}/resend-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to resend email");
      
      alert(`Email úspěšně odeslán na ${order.customer_email}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to resend email");
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

  // Parse items from JSON string if needed
  let parsedItems: unknown[] = [];
  try {
    if (typeof order.items === 'string') {
      parsedItems = JSON.parse(order.items);
    } else if (Array.isArray(order.items)) {
      parsedItems = order.items;
    }
  } catch (e) {
    console.error('Failed to parse items:', e);
    parsedItems = [];
  }

  // Separate products from shipping
  const products = parsedItems.filter((item: unknown) => {
    const typedItem = item as { description?: string };
    return !typedItem.description?.toLowerCase().includes('shipping') && 
           !typedItem.description?.toLowerCase().includes('doprava');
  });
  
  const shipping = parsedItems.filter((item: unknown) => {
    const typedItem = item as { description?: string };
    return typedItem.description?.toLowerCase().includes('shipping') || 
           typedItem.description?.toLowerCase().includes('doprava');
  });

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
            <>
              <Button variant="outline" onClick={printPacketaLabel}>
                Print Label
              </Button>
              <Button variant="destructive" onClick={cancelPacketaShipment} disabled={loading}>
                Cancel Shipment
              </Button>
            </>
          )}
          {order.customer_email && (
            <Button variant="outline" onClick={() => resendOrderEmail('receipt')} disabled={loading}>
              Resend Receipt
            </Button>
          )}
          {order.customer_email && order.status !== 'new' && (
            <Button variant="outline" onClick={() => resendOrderEmail('status')} disabled={loading}>
              Resend Status
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
              <p className="text-sm">
                <span className="font-mono text-lg font-bold text-blue-600">{formatOrderId(order.id)}</span>
                <br />
                <span className="text-xs text-gray-500 break-all">{order.id}</span>
              </p>
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
              <p className="text-sm">{order.amount_total ? `${(order.amount_total / 100).toFixed(2)} CZK` : "-"}</p>
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
              {order.packeta_shipment_id ? (
                <a 
                  href={`https://www.zasilkovna.cz/sledovani/${order.packeta_shipment_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {order.packeta_shipment_id} ↗
                </a>
              ) : (
                <p className="text-sm">-</p>
              )}
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
            {parsedItems.length > 0 ? (
              <div className="space-y-6">
                {/* Products Section */}
                {products.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-gray-800">Produkty</h3>
                    <div className="space-y-4">
                      {products.map((item: unknown, idx: number) => {
                  const typedItem = item as { 
                    description?: string;
                    name?: string; 
                    size?: string; 
                    color?: string; 
                    quantity?: number; 
                    amount_total?: number;
                    price?: number;
                    image?: string;
                    product_id?: string;
                    variant_id?: string;
                    total?: number;
                  };
                  const itemName = typedItem.description || typedItem.name || 'Unknown item';
                  const itemPrice = typedItem.amount_total ? (typedItem.amount_total / 100) : (typedItem.price || 0);
                  const productImage = getProductImage(itemName);
                  return (
                    <div key={idx} className="border rounded-lg p-4 bg-white">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          {productImage ? (
                            <img 
                              src={productImage} 
                                      alt={itemName}
                              className="w-16 h-16 object-cover rounded border"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                              <span className="text-gray-400 text-lg">📦</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <div>
                                      <h4 className="font-medium text-lg">{itemName}</h4>
                              <div className="text-sm text-gray-600 mt-1 space-y-1">
                                {typedItem.size && (
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Size:</span>
                                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">{typedItem.size}</span>
                                  </div>
                                )}
                                {typedItem.color && (
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Color:</span>
                                    <span>{typedItem.color}</span>
                                  </div>
                                )}
                                {typedItem.product_id && (
                                  <div className="text-xs text-gray-500">Product ID: {typedItem.product_id}</div>
                                )}
                              </div>
                            </div>
                            
                            {/* Price & Quantity */}
                            <div className="text-right">
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="text-sm text-gray-600">Quantity</p>
                                  <p className="font-bold text-lg">{typedItem.quantity || 1}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">Unit Price: {itemPrice.toFixed(2)} CZK</p>
                                  <p className="font-bold text-lg text-green-600">
                                    {(itemPrice * (typedItem.quantity || 1)).toFixed(2)} CZK
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                      })}
                    </div>
                  </div>
                )}

                {/* Shipping Section */}
                {shipping.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-gray-800">Doprava</h3>
                    <div className="space-y-4">
                      {shipping.map((item: unknown, idx: number) => {
                        const typedItem = item as { 
                          description?: string;
                          quantity?: number; 
                          amount_total?: number;
                        };
                        const itemName = typedItem.description || 'Shipping';
                        const itemPrice = typedItem.amount_total ? (typedItem.amount_total / 100) : 0;
                        
                        return (
                          <div key={idx} className="border rounded-lg p-4 bg-blue-50">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-100 rounded border flex items-center justify-center">
                                  <span className="text-blue-600 text-lg">🚚</span>
                                </div>
                                <div>
                                  <h4 className="font-medium text-lg">{itemName}</h4>
                                  <p className="text-sm text-gray-600">Množství: {typedItem.quantity || 1}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg text-blue-600">
                                  {itemPrice.toFixed(2)} CZK
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Order Total Summary */}
                <div className="border-t pt-4 bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Order Total:</span>
                    <span className="text-xl font-bold text-green-600">
                      {order.amount_total ? `${(order.amount_total / 100).toFixed(2)} CZK` : 'N/A'}
                    </span>
                  </div>
                </div>
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
            <div className="space-y-6">
              {/* Add Note Section */}
              <div>
                <h4 className="font-medium mb-2">Add Note</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addNote()}
                  />
                  <Button onClick={addNote}>Add</Button>
                </div>
              </div>

              {/* Email History Section */}
              <div>
                <h4 className="font-medium mb-2">Email History</h4>
                <div className="space-y-2 bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {order.customer_email && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          📧 Order confirmation
                        </span>
                        <span className="text-gray-500">
                          {new Date(order.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      {/* Status change emails */}
                      {order.status !== 'new' && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            🔄 Status changed to: {order.status}
                          </span>
                          <span className="text-gray-500">
                            {order.updated_at ? new Date(order.updated_at).toLocaleString() : new Date(order.created_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                      
                      {order.packeta_shipment_id && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            📦 Shipping notification
                          </span>
                          <span className="text-gray-500">
                            {order.updated_at ? new Date(order.updated_at).toLocaleString() : new Date(order.created_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-600 pl-6 border-t pt-2">
                        All emails sent to: {order.customer_email}
                      </div>
                    </>
                  )}
                  
                  {!order.customer_email && (
                    <p className="text-gray-500 text-sm">No customer email - no emails sent</p>
                  )}
                </div>
              </div>
              
              {/* Notes Section */}
              <div>
                <h4 className="font-medium mb-2">Internal Notes</h4>
                <div className="space-y-3 max-h-40 overflow-y-auto">
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}