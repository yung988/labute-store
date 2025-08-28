"use client";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatOrderId } from "@/lib/product-images";
import { createClient } from "@/lib/supabase/client";
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Eye,
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  Clock,
  Mail,
  Phone,
  MoreHorizontal,
  Printer
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Order = {
  id: string;
  stripe_session_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  packeta_point_id: string | null;
  packeta_shipment_id: string | null;
  items: string | unknown[];
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
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

  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formatOrderId(order.id).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: number | string, bVal: number | string;
      
      switch (sortBy) {
        case "date":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case "amount":
          aVal = a.amount_total || 0;
          bVal = b.amount_total || 0;
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          aVal = 0;
          bVal = 0;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [orders, searchQuery, statusFilter, sortBy, sortOrder]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id);

      if (error) throw new Error(error.message || "Update failed");
      
      setOrders(prev => prev.map(o => (o.id === id ? { ...o, status } : o)));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Update failed");
    }
  };

  const createPacketaShipment = async (orderId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('packeta_create_shipment', {
        body: { orderId }
      });

      if (error) throw new Error(error.message || "Failed to create shipment");

      await updateStatus(orderId, "shipped");
      alert(`Zásilka vytvořena! Packeta ID: ${data.packetaId}`);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create shipment");
    } finally {
      setLoading(false);
    }
  };

  const printPacketaLabel = async (orderId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('packeta_print_label', {
        body: { orderId }
      });

      if (error) throw new Error(error.message || "Failed to get label");

      // Edge Function returns base64 encoded PDF
      if (!data?.pdf) throw new Error("No PDF data received");

      // Convert base64 to blob
      const binaryString = atob(data.pdf);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename || `packeta-label-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to print label");
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
      case 'new':
        return <Badge variant="outline">Nová</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const statuses = ["new", "paid", "processing", "shipped", "cancelled", "refunded"];
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    statuses.forEach(status => {
      counts[status] = orders.filter(o => o.status === status).length;
    });
    return counts;
  }, [orders, statuses]);

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Načítání objednávek...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{statusCounts.all}</div>
            <div className="text-sm text-muted-foreground">Celkem</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.new}</div>
            <div className="text-sm text-muted-foreground">Nové</div>
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

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Objednávky ({filteredAndSortedOrders.length})</span>
            <div className="flex gap-2">
              <Button onClick={load} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Obnovit
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Hledat podle ID, jména, emailu nebo telefonu..."
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
                <SelectItem value="new">Nové ({statusCounts.new})</SelectItem>
                <SelectItem value="paid">Zaplacené ({statusCounts.paid})</SelectItem>
                <SelectItem value="processing">Zpracovávají se ({statusCounts.processing})</SelectItem>
                <SelectItem value="shipped">Odesláno ({statusCounts.shipped})</SelectItem>
                <SelectItem value="cancelled">Zrušeno ({statusCounts.cancelled})</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [sort, order] = value.split('-');
              setSortBy(sort as typeof sortBy);
              setSortOrder(order as typeof sortOrder);
            }}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Řadit podle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Nejnovější</SelectItem>
                <SelectItem value="date-asc">Nejstarší</SelectItem>
                <SelectItem value="amount-desc">Nejvyšší částka</SelectItem>
                <SelectItem value="amount-asc">Nejnižší částka</SelectItem>
                <SelectItem value="status-asc">Status A-Z</SelectItem>
                <SelectItem value="status-desc">Status Z-A</SelectItem>
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
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-32">ID objednávky</TableHead>
                  <TableHead>Zákazník</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-32">Částka</TableHead>
                  <TableHead>Packeta</TableHead>
                  <TableHead className="w-32">Datum</TableHead>
                  <TableHead className="w-20">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchQuery || statusFilter !== 'all' ? 'Žádné objednávky nenalezeny' : 'Zatím žádné objednávky'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedOrders.map((order) => {
                    // Parse items
                    let items: unknown[] = [];
                    try {
                      if (typeof order.items === 'string') {
                        items = JSON.parse(order.items);
                      } else if (Array.isArray(order.items)) {
                        items = order.items;
                      }
                    } catch {
                      items = [];
                    }

                    return (
                      <TableRow
                        key={order.id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => onOrderClick?.(order.id)}
                      >
                        <TableCell>
                          <div className="font-mono font-bold text-primary">
                            {formatOrderId(order.id)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {items.length} položek
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="font-medium">{order.customer_name || "Nezadáno"}</div>
                          <div className="text-sm text-muted-foreground">{order.customer_email}</div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            {order.customer_email && (
                              <a
                                href={`mailto:${order.customer_email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Mail className="w-4 h-4" />
                              </a>
                            )}
                            {order.customer_phone && (
                              <a
                                href={`tel:${order.customer_phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                          {order.customer_phone && (
                            <div className="text-xs text-muted-foreground">
                              {order.customer_phone}
                            </div>
                          )}
                        </TableCell>

                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={order.status}
                            onValueChange={(status) => updateStatus(order.id, status)}
                          >
                            <SelectTrigger className="w-full h-8 text-xs">
                              <SelectValue asChild>
                                {getStatusBadge(order.status)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map(status => (
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
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold">
                            {order.amount_total ? `${(order.amount_total / 100).toFixed(2)} Kč` : '-'}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs space-y-1">
                            {order.packeta_point_id && (
                              <div className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                {order.packeta_point_id}
                              </div>
                            )}
                            {order.packeta_shipment_id && (
                              <div className="flex items-center gap-1 text-blue-600">
                                <Truck className="w-3 h-3" />
                                {order.packeta_shipment_id}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            {new Date(order.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleTimeString()}
                          </div>
                        </TableCell>

                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onOrderClick?.(order.id)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Detail
                              </DropdownMenuItem>
                              
                              {order.packeta_point_id && order.status === "paid" && !order.packeta_shipment_id && (
                                <DropdownMenuItem onClick={() => createPacketaShipment(order.id)}>
                                  <Package className="w-4 h-4 mr-2" />
                                  Vytvořit zásilku
                                </DropdownMenuItem>
                              )}
                              
                              {order.packeta_shipment_id && (
                                <DropdownMenuItem onClick={() => printPacketaLabel(order.id)}>
                                  <Printer className="w-4 h-4 mr-2" />
                                  Tisknout štítek
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}