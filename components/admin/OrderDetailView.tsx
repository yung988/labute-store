"use client";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  Edit, 
  FileText, 
  Mail,
  Phone,
  MapPin,
  Printer,
  Trash2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
  Users
} from "lucide-react";
// Dialog components removed - not used in this component
import { createClient } from "@/lib/supabase/client";
import { formatOrderId } from "@/lib/product-images";

type OrderDetail = {
  id: string;
  stripe_session_id: string | null;
  stripe_invoice_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  packeta_point_id: string | null;
  packeta_shipment_id: string | null;
  packeta_barcode: string | null;
  packeta_tracking_url: string | null;
  delivery_method: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_postal_code: string | null;
  delivery_country: string | null;
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


  // Helper function to truncate long text
  const truncateText = (text: string | null, maxLength: number = 20) => {
    if (!text) return "Nezadáno";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };


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
      setEditedOrder({ ...orderData, stripe_invoice_id: orderData.stripe_invoice_id });

      // Delivery method is now stored directly in the order data

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
    if (!confirm("Opravdu vytvořit Packeta zásilku?")) return;

    try {
      setLoading(true);
      
      // Call the Next.js API route instead of edge function
      const response = await fetch('/api/admin/packeta/create-shipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      alert(`Packeta zásilka vytvořena: ${data?.message || 'Success'}`);
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
      
      // Call the Next.js API route instead of edge function
      const response = await fetch('/api/admin/packeta/cancel-shipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      alert("Packeta zásilka zrušena");
      await loadOrder();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to cancel shipment");
    } finally {
      setLoading(false);
    }
  };

  const rollbackInventory = async () => {
    if (!confirm("Opravdu chcete vrátit položky zpět do skladu a zrušit objednávku?")) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/admin/orders/${orderId}/rollback-inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      alert(`Inventář vrácen: ${result.message}`);
      await loadOrder();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to rollback inventory");
    } finally {
      setLoading(false);
    }
  };

      const printPacketaLabel = async () => {
        try {
          // Call the Next.js API route with direct=true to get PDF directly
          const response = await fetch(`/api/admin/packeta/print-label/${orderId}?direct=true`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }

          // Check if response is PDF (direct download)
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/pdf')) {
            // Direct PDF download
            const pdfBlob = await response.blob();
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, '_blank');

            // Clean up the object URL after a delay
            setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000);
          } else {
            // JSON response with URL
            const data = await response.json();

            if (data.error) {
              throw new Error(data.error);
            }

            if (!data.success || !data.url) {
              throw new Error("Invalid response from server");
            }

            // Open the PDF URL in a new tab/window
            window.open(data.url, '_blank');
          }

         alert("Štítek byl otevřen!");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to print label");
        console.error("Print label error:", e);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Zaplaceno</Badge>;
      case 'shipped':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Truck className="w-3 h-3 mr-1" />Odesláno</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><AlertCircle className="w-3 h-3 mr-1" />Zrušeno</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Zpracovává se</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const sendCustomerEmail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/orders/${orderId}/resend-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'receipt' }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      alert('Email byl odeslán zákazníkovi!');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async () => {
    if (!confirm('Opravdu smazat tuto objednávku? Tato akce je nevratná.')) return;
    
    try {
      setLoading(true);
      const supabase = createClient();
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw new Error(error.message);
      
      alert('Objednávka byla smazána');
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zpět
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Objednávka #{formatOrderId(order.id)}</h1>
            <p className="text-muted-foreground">Vytvořeno {new Date(order.created_at).toLocaleString()}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {!editMode && (
            <>
              <Button onClick={() => setEditMode(true)} variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Upravit
              </Button>
              {order.customer_email && (
                <Button onClick={sendCustomerEmail} variant="outline" size="sm" disabled={loading}>
                  <Mail className="w-4 h-4 mr-2" />
                  Poslat email
                </Button>
              )}
              <Button onClick={deleteOrder} variant="destructive" size="sm" disabled={loading}>
                <Trash2 className="w-4 h-4 mr-2" />
                Smazat
              </Button>
            </>
          )}
          
          {editMode && (
            <>
              <Button onClick={saveOrder} disabled={loading} size="sm">
                Uložit
              </Button>
              <Button onClick={() => setEditMode(false)} variant="outline" size="sm">
                Zrušit
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          <AlertCircle className="w-4 h-4 inline mr-2" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Info & Customer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status & Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Informace o objednávce</span>
                {getStatusBadge(order.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">ID objednávky</Label>
                  <p className="font-mono text-sm bg-muted p-2 rounded mt-1">{order.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
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
                          <SelectItem key={status} value={status}>
                            {status === 'new' ? 'Nová' :
                             status === 'paid' ? 'Zaplaceno' :
                             status === 'processing' ? 'Zpracovává se' :
                             status === 'shipped' ? 'Odesláno' :
                             status === 'cancelled' ? 'Zrušeno' :
                             status === 'refunded' ? 'Vráceno' : status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1">{getStatusBadge(order.status)}</div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Celková částka</Label>
                  <p className="text-xl font-bold mt-1">
                    {order.amount_total ? `${(order.amount_total / 100).toFixed(2)} Kč` : "Nezadáno"}
                  </p>
                </div>
                 <div>
                   <Label className="text-sm font-medium text-muted-foreground">Stripe Session ID</Label>
                   <p className="text-sm mt-1 text-muted-foreground">
                     {truncateText(order.stripe_session_id, 25)}
                   </p>
                 </div>
                 {order.stripe_invoice_id && (
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">Stripe Faktura</Label>
                     <p className="text-sm mt-1">
                       <a
                         href={`https://dashboard.stripe.com/invoices/${order.stripe_invoice_id}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                       >
                         {truncateText(order.stripe_invoice_id, 25)}
                         <ExternalLink className="w-3 h-3" />
                       </a>
                     </p>
                   </div>
                 )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Informace o zákazníkovi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Jméno</Label>
                  {editMode ? (
                    <Input
                      value={editedOrder.customer_name || ""}
                      onChange={(e) => setEditedOrder(prev => ({ ...prev, customer_name: e.target.value }))}
                      className="mt-1"
                      placeholder="Jméno zákazníka"
                    />
                  ) : (
                    <p className="text-sm mt-1 flex items-center gap-2">
                      {order.customer_name || "Nezadáno"}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  {editMode ? (
                    <Input
                      type="email"
                      value={editedOrder.customer_email || ""}
                      onChange={(e) => setEditedOrder(prev => ({ ...prev, customer_email: e.target.value }))}
                      className="mt-1"
                      placeholder="email@example.com"
                    />
                  ) : (
                    <p className="text-sm mt-1 flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      {order.customer_email || "Nezadáno"}
                      {order.customer_email && (
                        <a
                          href={`mailto:${order.customer_email}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Telefon</Label>
                  {editMode ? (
                    <Input
                      value={editedOrder.customer_phone || ""}
                      onChange={(e) => setEditedOrder(prev => ({ ...prev, customer_phone: e.target.value }))}
                      className="mt-1"
                      placeholder="+420 xxx xxx xxx"
                    />
                  ) : (
                    <p className="text-sm mt-1 flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      {order.customer_phone || "Nezadáno"}
                      {order.customer_phone && (
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Položky objednávky
                </CardTitle>
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
                    const itemName = typedItem.description || typedItem.name || 'Neznámá položka';
                    return (
                      <div key={idx} className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{itemName}</p>
                          {typedItem.size && (
                            <p className="text-sm text-muted-foreground">Velikost: {typedItem.size}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {typedItem.quantity && (
                            <p className="text-sm font-medium">Množství: {typedItem.quantity}</p>
                          )}
                          {typedItem.price && (
                            <p className="font-semibold">{(typedItem.price / 100).toFixed(2)} Kč</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Packeta & Timeline */}
        <div className="space-y-6">
          {/* Packeta Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Packeta zásilka
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div>
                 <Label className="text-sm font-medium text-muted-foreground">
                   Způsob doručení
                 </Label>
                 <p className="text-sm mt-1 flex items-center gap-2">
                   {order.delivery_method === 'home_delivery' ? (
                     <>
                       <Truck className="w-3 h-3 text-green-600" />
                       <span className="text-green-600">Doručení domů</span>
                     </>
                   ) : (
                     <>
                       <Package className="w-3 h-3 text-blue-600" />
                       <span className="text-blue-600">Výdejní místo</span>
                     </>
                   )}
                 </p>
               </div>

               <div>
                 <Label className="text-sm font-medium text-muted-foreground">
                   {order.delivery_method === 'home_delivery' ? 'Adresa doručení' : 'Výdejní místo'}
                 </Label>
                 <p className="text-sm mt-1 flex items-start gap-2">
                   <MapPin className="w-3 h-3 mt-0.5" />
                   {order.delivery_method === 'home_delivery' ? (
                     order.delivery_address ? (
                       <div>
                         <div>{order.delivery_address}</div>
                         <div className="text-muted-foreground">
                           {order.delivery_city} {order.delivery_postal_code}
                         </div>
                         <div className="text-muted-foreground text-xs">
                           {order.delivery_country || 'CZ'}
                         </div>
                       </div>
                     ) : (
                       "Nezadáno"
                     )
                   ) : (
                     order.packeta_point_id || "Nezadáno"
                   )}
                 </p>
               </div>
              
               <div>
                 <Label className="text-sm font-medium text-muted-foreground">ID zásilky</Label>
                 <p className="text-sm mt-1 font-mono">
                   {order.packeta_shipment_id || "Nevytvořena"}
                 </p>
               </div>

               {order.packeta_barcode && (
                 <div>
                   <Label className="text-sm font-medium text-muted-foreground">Sledovací číslo</Label>
                   <p className="text-sm mt-1">
                     {order.packeta_tracking_url ? (
                       <a
                         href={order.packeta_tracking_url}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="font-mono text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                       >
                         {order.packeta_barcode}
                         <ExternalLink className="w-3 h-3" />
                       </a>
                     ) : (
                       <span className="font-mono">{order.packeta_barcode}</span>
                     )}
                   </p>
                 </div>
               )}



              <Separator />

              <div className="space-y-2">
                {((order.packeta_point_id && order.delivery_method !== 'home_delivery') || 
                  (order.delivery_method === 'home_delivery' && order.delivery_address)) && 
                  order.status === "paid" && !order.packeta_shipment_id && (
                  <Button
                    onClick={createPacketaShipment}
                    disabled={loading}
                    className="w-full"
                    size="sm"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Vytvořit zásilku
                  </Button>
                )}
                
                {order.packeta_shipment_id && (
                  <div className="space-y-2">
                    <Button
                      onClick={printPacketaLabel}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Tisknout štítek
                    </Button>
                     <Button
                       onClick={cancelPacketaShipment}
                       variant="destructive"
                       className="w-full"
                       size="sm"
                       disabled={loading}
                     >
                       <AlertCircle className="w-4 h-4 mr-2" />
                       Zrušit zásilku
                     </Button>
                   </div>
                 )}
                 
                 {/* Rollback inventáře - pouze pro zaplacené objednávky */}
                 {(order.status === "paid" || order.status === "shipped") && (
                   <Button
                     onClick={rollbackInventory}
                     variant="destructive"
                     className="w-full"
                     size="sm"
                     disabled={loading}
                   >
                     <AlertCircle className="w-4 h-4 mr-2" />
                     Vrátit do skladu & Zrušit
                   </Button>
                 )}
               </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          {timeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timeline.map((event, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {event.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{event.event}</p>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
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
      </div>
    </div>
  );
}