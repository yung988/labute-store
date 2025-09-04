'use client';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatOrderId } from '@/lib/product-images';
import { createClient } from '@/lib/supabase/client';
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
  Printer,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Order = {
  id: string;
  stripe_session_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  packeta_point_id: string | null;
  packeta_shipment_id: string | null;
  delivery_method: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_postal_code: string | null;
  delivery_country: string | null;
  items: string | unknown[];
  status: string;
  amount_total: number | null;
  shipping_amount: number | null;
  created_at: string;
  label_printed_at: string | null;
  label_printed_count: number | null;
};

interface OrdersTableProps {
  onOrderClick?: (orderId: string) => void;
  onNavigateToEmails?: (orderId?: string, customerEmail?: string) => void;
}

export default function OrdersTable({ onOrderClick, onNavigateToEmails }: OrdersTableProps = {}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Pagination state
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(50);

  const loadOrders = useCallback(
    async (cursor?: string | null, append = false) => {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        // Build query parameters
        const params = new URLSearchParams();
        params.set('limit', pageSize.toString());

        if (cursor) {
          params.set('cursor', cursor);
        }

        if (statusFilter !== 'all') {
          params.set('status', statusFilter);
        }

        if (searchQuery.trim()) {
          params.set('search', searchQuery.trim());
        }

        const response = await fetch(`/api/admin/orders?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (append) {
          setOrders((prev) => [...prev, ...data.orders]);
        } else {
          setOrders(data.orders);
        }

        setNextCursor(data.pagination.nextCursor);
        setHasMore(data.pagination.hasMore);
        setTotalCount(data.pagination.count);
      } catch (e: unknown) {
        console.error('Load orders error:', e);
        setError(e instanceof Error ? e.message : 'Failed to load orders');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [pageSize, statusFilter, searchQuery]
  );

  const loadMore = useCallback(async () => {
    if (nextCursor && hasMore && !loadingMore) {
      await loadOrders(nextCursor, true);
    }
  }, [nextCursor, hasMore, loadingMore, loadOrders]);

  const load = useCallback(async () => {
    await loadOrders(null, false);
  }, [loadOrders]);

  useEffect(() => {
    load();
  }, [statusFilter, searchQuery, load]);

  // Real-time updates subscription
  useEffect(() => {
    const supabase = createClient();

    // Subscribe to orders table changes
    const channel = supabase
      .channel('orders-changes')
      .on(
        'system',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload: { eventType: string; new?: Order; old?: Order }) => {
          console.log('Real-time order update:', payload);

          if (payload.eventType === 'INSERT') {
            // Add new order to the list if it matches current filters
            const newOrder = payload.new as Order;
            setOrders((prev) => {
              // Check if order already exists (avoid duplicates)
              if (prev.some((order) => order.id === newOrder.id)) {
                return prev;
              }

              // Add to beginning of list (newest first)
              const updated = [newOrder, ...prev];

              // If we have more than pageSize items, remove the oldest
              if (updated.length > pageSize) {
                updated.splice(pageSize);
              }

              return updated;
            });

            // Update total count
            setTotalCount((prev) => prev + 1);
          } else if (payload.eventType === 'UPDATE') {
            // Update existing order
            const updatedOrder = payload.new as Order;
            setOrders((prev) =>
              prev.map((order) =>
                order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
              )
            );
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted order
            const deletedOrder = payload.old as Order;
            setOrders((prev) => prev.filter((order) => order.id !== deletedOrder.id));
            setTotalCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [pageSize]);

  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customer_phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          formatOrderId(order.id).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: number | string, bVal: number | string;

      switch (sortBy) {
        case 'date':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case 'amount':
          aVal = a.amount_total || 0;
          bVal = b.amount_total || 0;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          aVal = 0;
          bVal = 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [orders, searchQuery, statusFilter, sortBy, sortOrder]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);

      if (error) throw new Error(error.message || 'Update failed');

      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Update failed');
    }
  };

  const createPacketaShipment = async (orderId: string) => {
    try {
      setLoading(true);

      // Call the Next.js API route instead of edge function
      const response = await fetch('/api/admin/packeta/create-shipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      await updateStatus(orderId, 'shipped');
      alert(`Zásilka vytvořena! Packeta ID: ${data.packetaId}`);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  const printPacketaLabel = (orderId: string) => {
    // Open PDF directly from API (no storage)
    const url = `/api/admin/packeta/print-label/${orderId}?direct=true`;
    console.log(`🔗 Opening direct PDF: ${url}`);
    const win = window.open(url, '_blank');
    if (!win) {
      setError('Prohlížeč zablokoval nové okno. Povolte prosím vyskakovací okna.');
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) => {
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
    const filteredOrderIds = filteredAndSortedOrders.map((o) => o.id);
    if (selectedOrders.size === filteredOrderIds.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrderIds));
    }
  };

  const bulkPrintLabels = async () => {
    if (selectedOrders.size === 0) {
      alert('Vyberte alespoň jednu objednávku');
      return;
    }

    try {
      setBulkLoading(true);
      console.log(`📦 Bulk printing ${selectedOrders.size} labels`);

      // Use direct PDF mode like PacketaManagement.tsx
      const url = '/api/admin/packeta/bulk-print-labels?direct=true';
      console.log(`🔗 Opening bulk direct PDF for ${selectedOrders.size} orders`);

      // Open in new tab via form POST (window.open can't do POST)
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = url;
      form.target = '_blank';

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'payload';
      input.value = JSON.stringify({ orderIds: Array.from(selectedOrders), format: 'A6' });
      form.appendChild(input);

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);

      // Clear selection after successful print
      setSelectedOrders(new Set());

      // Reload orders to update print indicators
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to bulk print labels');
    } finally {
      setBulkLoading(false);
    }
  };

  // Memoized status badge component
  const StatusBadge = React.memo(({ status }: { status: string }) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Zaplaceno
          </Badge>
        );
      case 'shipped':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Truck className="w-3 h-3 mr-1" />
            Odesláno
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Zrušeno
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Zpracovává se
          </Badge>
        );
      case 'new':
        return <Badge variant="outline">Nová</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  });

  StatusBadge.displayName = 'StatusBadge';

  const statuses = useMemo(
    () => ['new', 'paid', 'processing', 'shipped', 'cancelled', 'refunded'],
    []
  );
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: totalCount };
    // For filtered views, we can't accurately count statuses without loading all
    // So we'll show approximate counts based on loaded orders
    statuses.forEach((status) => {
      counts[status] = orders.filter((o) => o.status === status).length;
    });
    return counts;
  }, [orders, statuses, totalCount]);

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

  const exportCsv = (rows: Order[]) => {
    const header = [
      'id',
      'customer_email',
      'customer_name',
      'status',
      'amount_total',
      'shipping_amount',
      'created_at',
      'delivery_method',
      'packeta_point_id',
      'packeta_shipment_id',
    ];
    const body = rows.map((o) => [
      o.id,
      o.customer_email || '',
      o.customer_name || '',
      o.status,
      o.amount_total ?? '',
      o.shipping_amount ?? '',
      o.created_at,
      o.delivery_method || '',
      o.packeta_point_id || '',
      o.packeta_shipment_id || '',
    ]);
    const csv = [header, ...body]
      .map((r) =>
        r
          .map((x) =>
            typeof x === 'string' && x.includes(',') ? `"${x.replaceAll('"', '""')}"` : x
          )
          .join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
            <div className="flex items-center gap-4">
              <span>
                Objednávky ({totalCount > 0 ? `${orders.length} z ${totalCount}` : orders.length})
              </span>
              {selectedOrders.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Vybráno: {selectedOrders.size}
                  </span>
                  <Button
                    onClick={bulkPrintLabels}
                    variant="default"
                    size="sm"
                    disabled={bulkLoading}
                  >
                    <Printer className={`w-4 h-4 mr-2 ${bulkLoading ? 'animate-spin' : ''}`} />
                    {bulkLoading ? 'Tisknu...' : 'Tisknout štítky'}
                  </Button>
                  <Button onClick={() => setSelectedOrders(new Set())} variant="outline" size="sm">
                    Zrušit výběr
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={load} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Obnovit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCsv(filteredAndSortedOrders)}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
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
                <SelectItem value="processing">
                  Zpracovávají se ({statusCounts.processing})
                </SelectItem>
                <SelectItem value="shipped">Odesláno ({statusCounts.shipped})</SelectItem>
                <SelectItem value="cancelled">Zrušeno ({statusCounts.cancelled})</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={(value) => {
                const [sort, order] = value.split('-');
                setSortBy(sort as typeof sortBy);
                setSortOrder(order as typeof sortOrder);
              }}
            >
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
          <div className="border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedOrders.size === filteredAndSortedOrders.length &&
                        filteredAndSortedOrders.length > 0
                      }
                      onCheckedChange={toggleSelectAll}
                      aria-label="Vybrat všechny objednávky"
                    />
                  </TableHead>
                  <TableHead className="w-32 font-semibold">ID objednávky</TableHead>
                  <TableHead className="font-semibold">Zákazník</TableHead>
                  <TableHead className="font-semibold">Kontakt</TableHead>
                  <TableHead className="w-32 font-semibold">Status</TableHead>
                  <TableHead className="w-32 font-semibold">Částka</TableHead>
                  <TableHead className="font-semibold">Doručení</TableHead>
                  <TableHead className="w-32 font-semibold">Datum</TableHead>
                  <TableHead className="w-20 font-semibold">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {searchQuery || statusFilter !== 'all'
                        ? 'Žádné objednávky nenalezeny'
                        : 'Zatím žádné objednávky'}
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
                      <ContextMenu key={order.id}>
                        <ContextMenuTrigger asChild>
                          <TableRow
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onOrderClick?.(order.id);
                              }
                            }}
                            className={`hover:bg-muted/50 cursor-pointer ${selectedOrders.has(order.id) ? 'bg-muted/30' : ''}`}
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('[role="checkbox"]')) return;
                              onOrderClick?.(order.id);
                            }}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedOrders.has(order.id)}
                                onCheckedChange={() => toggleOrderSelection(order.id)}
                                aria-label={`Vybrat objednávku ${order.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="font-mono font-bold text-primary">
                                    {formatOrderId(order.id)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {items.length} položek
                                  </div>
                                </div>
                                {order.label_printed_at && (
                                  <div
                                    className="flex items-center gap-1 text-green-600"
                                    title={`Štítek vytisknut: ${new Date(order.label_printed_at).toLocaleString()}`}
                                  >
                                    <Printer className="w-3 h-3" />
                                    <span className="text-xs">✓</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="font-medium">{order.customer_name || 'Nezadáno'}</div>
                              <div className="text-sm text-muted-foreground">
                                {order.customer_email ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onNavigateToEmails?.(
                                        order.id,
                                        order.customer_email || undefined
                                      );
                                    }}
                                    className="text-blue-600 hover:text-blue-800 underline hover:no-underline"
                                  >
                                    {order.customer_email}
                                  </button>
                                ) : (
                                  'Nezadáno'
                                )}
                              </div>
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
                                    <StatusBadge status={order.status} />
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {statuses.map((status) => (
                                    <SelectItem key={status} value={status}>
                                      {status === 'new'
                                        ? 'Nová'
                                        : status === 'paid'
                                          ? 'Zaplaceno'
                                          : status === 'processing'
                                            ? 'Zpracovává se'
                                            : status === 'shipped'
                                              ? 'Odesláno'
                                              : status === 'cancelled'
                                                ? 'Zrušeno'
                                                : status === 'refunded'
                                                  ? 'Vráceno'
                                                  : status}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            <TableCell>
                              <div className="font-semibold">
                                {order.amount_total
                                  ? `${(order.amount_total / 100).toFixed(2)} Kč`
                                  : '-'}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="text-xs space-y-1">
                                {/* Delivery method indicator */}
                                <div className="flex items-center gap-1">
                                  {order.delivery_method === 'home_delivery' ? (
                                    <>
                                      <Truck className="w-3 h-3 text-green-600" />
                                      <span className="text-green-600">Domů</span>
                                    </>
                                  ) : (
                                    <>
                                      <Package className="w-3 h-3 text-blue-600" />
                                      <span className="text-blue-600">Výdejní místo</span>
                                    </>
                                  )}
                                </div>

                                {/* Address or pickup point */}
                                {order.delivery_method === 'home_delivery'
                                  ? order.delivery_address && (
                                      <div className="text-muted-foreground">
                                        {order.delivery_address}, {order.delivery_city}{' '}
                                        {order.delivery_postal_code}
                                      </div>
                                    )
                                  : order.packeta_point_id && (
                                      <div className="text-muted-foreground">
                                        ID: {order.packeta_point_id}
                                      </div>
                                    )}
                                {typeof order.shipping_amount === 'number' && (
                                  <div className="text-muted-foreground">
                                    Doprava: {(order.shipping_amount / 100).toFixed(2)} Kč
                                  </div>
                                )}

                                {/* Shipment ID if exists */}
                                {order.packeta_shipment_id && (
                                  <div className="flex items-center gap-1 text-orange-600">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>#{order.packeta_shipment_id}</span>
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

                                  {order.packeta_point_id &&
                                    order.status === 'paid' &&
                                    !order.packeta_shipment_id && (
                                      <DropdownMenuItem
                                        onClick={() => createPacketaShipment(order.id)}
                                      >
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
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => onOrderClick?.(order.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Detail objednávky
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem onClick={() => toggleOrderSelection(order.id)}>
                            <Checkbox className="w-4 h-4 mr-2" />
                            {selectedOrders.has(order.id) ? 'Odebrat z výběru' : 'Přidat do výběru'}
                          </ContextMenuItem>
                          {selectedOrders.size > 0 && (
                            <ContextMenuItem onClick={bulkPrintLabels} disabled={bulkLoading}>
                              <Printer className="w-4 h-4 mr-2" />
                              Tisknout vybrané štítky ({selectedOrders.size})
                            </ContextMenuItem>
                          )}
                          <ContextMenuSeparator />
                          {order.packeta_point_id &&
                            order.status === 'paid' &&
                            !order.packeta_shipment_id && (
                              <ContextMenuItem onClick={() => createPacketaShipment(order.id)}>
                                <Package className="w-4 h-4 mr-2" />
                                Vytvořit zásilku
                              </ContextMenuItem>
                            )}
                          {order.packeta_shipment_id && (
                            <ContextMenuItem onClick={() => printPacketaLabel(order.id)}>
                              <Printer className="w-4 h-4 mr-2" />
                              Tisknout štítek
                            </ContextMenuItem>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })
                )}

                {/* Load More Row */}
                {hasMore && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      <Button
                        onClick={loadMore}
                        disabled={loadingMore}
                        variant="outline"
                        className="w-full max-w-xs"
                      >
                        {loadingMore ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Načítání...
                          </>
                        ) : (
                          <>
                            <Package className="w-4 h-4 mr-2" />
                            Načíst více objednávek ({totalCount - orders.length} zbývá)
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
