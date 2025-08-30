"use client";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Truck, 
  Package, 
  Printer, 
  RefreshCw, 
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  Eye,
  X,
  Filter
} from "lucide-react";
import { formatOrderId } from "@/lib/product-images";
import { createClient } from "@/lib/supabase/client";

type PacketaShipment = {
  id: string;
  order_id: string;
  packeta_shipment_id: string;
  customer_name: string;
  customer_email: string;
  status: string;
  created_at: string;
  amount_total: number | null;
  packeta_point_id: string | null;
};

export default function PacketaManagement() {
  const [shipments, setShipments] = useState<PacketaShipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .not('packeta_shipment_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message || "Failed to load");
      
      // Transform data to match expected format
      const transformedData = ordersData.map(order => ({
        id: order.id,
        order_id: order.id,
        packeta_shipment_id: order.packeta_shipment_id,
        customer_name: order.customer_name || '',
        customer_email: order.customer_email || '',
        status: order.status,
        created_at: order.created_at,
        amount_total: order.amount_total,
        packeta_point_id: order.packeta_point_id
      }));
      
      setShipments(transformedData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  const filteredShipments = useMemo(() => {
    let filtered = shipments;

    if (searchQuery) {
      filtered = filtered.filter(shipment =>
        shipment.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shipment.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shipment.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shipment.packeta_shipment_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formatOrderId(shipment.order_id).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(shipment => shipment.status === statusFilter);
    }

    return filtered;
  }, [shipments, searchQuery, statusFilter]);

    const printLabel = async (orderId: string, format: string = 'A6') => {
      try {
        console.log(`🏷️ Requesting label for order ${orderId} with format ${format}`);

        // Call the Next.js API route instead of edge function
        const response = await fetch(`/api/admin/packeta/print-label/${orderId}?format=${encodeURIComponent(format)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`📡 API response:`, data);

        if (data.error) {
          throw new Error(data.error);
        }

        if (!data.success || !data.url) {
          console.error(`❌ Invalid response data:`, data);
          throw new Error("Invalid response from server");
        }

        // Open the PDF URL in a new tab/window
        console.log(`🔗 Opening URL: ${data.url}`);
        window.open(data.url, '_blank');
      } catch (e: unknown) {
        console.error(`❌ Print label error:`, e);
        setError(e instanceof Error ? e.message : "Failed to print label");
      }
    };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredShipments.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredShipments.map(s => s.order_id)));
    }
  };

   const bulkPrintLabels = async () => {
     if (selectedOrders.size === 0) {
       alert("Vyberte alespoň jednu objednávku");
       return;
     }

     try {
       setLoading(true);
       console.log(`📦 Bulk printing ${selectedOrders.size} labels`);

       // For bulk print, we'll call the single label function multiple times
       // This is simpler than creating a separate bulk function
       const urls: string[] = [];
       const errors: string[] = [];

        // Use bulk print API route
        const response = await fetch('/api/admin/packeta/bulk-print-labels', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderIds: selectedOrders,
            format: 'A6'
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.success && data.url) {
          urls.push(data.url);
        } else {
          errors.push(`Bulk print failed: Invalid response`);
        }

       if (urls.length === 0) {
         throw new Error(`Failed to generate any labels. Errors: ${errors.join(', ')}`);
       }

       if (urls.length === 1) {
         // Single label - open directly
         console.log(`🔗 Opening single label URL: ${urls[0]}`);
         window.open(urls[0], '_blank');
       } else {
         // Multiple labels - open first one and show summary
         console.log(`🔗 Opening first label, generated ${urls.length} labels`);
         window.open(urls[0], '_blank');

         if (errors.length > 0) {
           alert(`Generated ${urls.length} labels successfully, but ${errors.length} failed:\n${errors.join('\n')}`);
         } else {
           alert(`Successfully generated ${urls.length} labels`);
         }
       }

       setSelectedOrders(new Set());
     } catch (e: unknown) {
       console.error(`❌ Bulk print error:`, e);
       setError(e instanceof Error ? e.message : "Failed to bulk print labels");
     } finally {
       setLoading(false);
     }
   };

  const trackShipment = async (packetaId: string) => {
    try {
      const response = await fetch(`/api/admin/packeta/track/${packetaId}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to track");
      alert(`Status: ${json.status}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to track");
    }
  };

  const cancelShipment = async (orderId: string) => {
    if (!confirm("Opravdu chcete zrušit tuto zásilku?")) return;
    
    try {
      setLoading(true);
      const response = await fetch("/api/admin/packeta/cancel-shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to cancel");
      
      alert("Zásilka byla úspěšně zrušena");
      loadShipments();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to cancel shipment");
    } finally {
      setLoading(false);
    }
  };

  const bulkStatusCheck = async () => {
    if (!confirm("Zkontrolovat stavy všech aktivních Packeta zásilek? Toto může chvíli trvat.")) return;

    try {
      setLoading(true);
      
      // Call the Next.js API route instead of edge function
      const response = await fetch('/api/admin/run-packeta-cron', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      alert(`✅ Zkontrolováno: ${data.checked} zásilek, aktualizováno: ${data.updated} objednávek`);
      loadShipments();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Status check failed");
    } finally {
      setLoading(false);
    }
  };

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

  const statuses = ["paid", "processing", "shipped", "cancelled"];
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: shipments.length };
    statuses.forEach(status => {
      counts[status] = shipments.filter(s => s.status === status).length;
    });
    return counts;
  }, [shipments, statuses]);

  if (loading && shipments.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Načítání Packeta zásilek...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{statusCounts.all}</div>
            <div className="text-sm text-muted-foreground">Celkem zásilek</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{statusCounts.paid}</div>
            <div className="text-sm text-muted-foreground">Zaplacené</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{statusCounts.processing}</div>
            <div className="text-sm text-muted-foreground">Zpracovávají se</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.shipped}</div>
            <div className="text-sm text-muted-foreground">Odesláno</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{statusCounts.cancelled}</div>
            <div className="text-sm text-muted-foreground">Zrušeno</div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Operations */}
      {selectedOrders.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Vybráno {selectedOrders.size} zásilek</span>
              <div className="flex gap-2">
                <Button onClick={bulkPrintLabels} disabled={loading} size="sm">
                  {loading ? "Připravuji..." : "Hromadný tisk štítků"}
                  <Printer className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" onClick={() => setSelectedOrders(new Set())} size="sm">
                  <X className="w-4 h-4 mr-2" />
                  Zrušit výběr
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Packeta zásilky ({filteredShipments.length})
            </span>
            <div className="flex gap-2">
              <Button onClick={bulkStatusCheck} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Zkontrolovat stavy
              </Button>
              <Button onClick={loadShipments} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Obnovit
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Controls */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Hledat podle ID objednávky, zákazníka nebo Packeta ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrovat podle statusu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny ({statusCounts.all})</SelectItem>
                <SelectItem value="paid">Zaplacené ({statusCounts.paid})</SelectItem>
                <SelectItem value="processing">Zpracovávají se ({statusCounts.processing})</SelectItem>
                <SelectItem value="shipped">Odesláno ({statusCounts.shipped})</SelectItem>
                <SelectItem value="cancelled">Zrušeno ({statusCounts.cancelled})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-4">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              {error}
            </div>
          )}

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left">
                      <input
                        type="checkbox"
                        checked={filteredShipments.length > 0 && selectedOrders.size === filteredShipments.length}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="p-3 text-left font-medium">ID objednávky</th>
                    <th className="p-3 text-left font-medium">Packeta ID</th>
                    <th className="p-3 text-left font-medium">Zákazník</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-left font-medium">Částka</th>
                    <th className="p-3 text-left font-medium">Výdejní místo</th>
                    <th className="p-3 text-left font-medium">Vytvořeno</th>
                    <th className="p-3 text-left font-medium">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted-foreground">
                        {searchQuery || statusFilter !== 'all' ? 'Žádné zásilky nenalezeny' : 'Zatím žádné zásilky'}
                      </td>
                    </tr>
                  ) : (
                    filteredShipments.map((shipment) => (
                      <tr key={shipment.id} className="border-t hover:bg-muted/30">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(shipment.order_id)}
                            onChange={() => toggleOrderSelection(shipment.order_id)}
                            className="rounded"
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-mono font-bold text-primary">
                            {formatOrderId(shipment.order_id)}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-mono text-sm">
                            {shipment.packeta_shipment_id}
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{shipment.customer_name || "Nezadáno"}</div>
                            <div className="text-sm text-muted-foreground">{shipment.customer_email}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          {getStatusBadge(shipment.status)}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold">
                            {shipment.amount_total ? `${(shipment.amount_total / 100).toFixed(2)} Kč` : '-'}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3" />
                            {shipment.packeta_point_id || "Nezadáno"}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            {new Date(shipment.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(shipment.created_at).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => printLabel(shipment.order_id)}
                              title="Tisknout štítek"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => trackShipment(shipment.packeta_shipment_id)}
                              title="Sledovat zásilku"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => cancelShipment(shipment.order_id)}
                              disabled={loading}
                              title="Zrušit zásilku"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}