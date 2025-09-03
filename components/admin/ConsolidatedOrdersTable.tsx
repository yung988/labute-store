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
  MessageSquare,
  ExternalLink,
  CreditCard,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type ConsolidatedOrder = {
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
  updated_at: string | null;
  label_printed_at: string | null;
  label_printed_count: number | null;
  // Extended fields for consolidated view
  packeta_tracking_number: string | null;
  packeta_status: string | null;
  last_email_sent: string | null;
  email_count: number;
  notes: string | null;
};

interface ConsolidatedOrdersTableProps {
  onOrderClick?: (orderId: string) => void;
  onCommunicateWith?: (orderId: string) => void;
}

export default function ConsolidatedOrdersTable({
  onOrderClick,
  onCommunicateWith,
}: ConsolidatedOrdersTableProps = {}) {
  const [orders, setOrders] = useState<ConsolidatedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Main query with all necessary joins and filters
      let query = supabase
        .from('orders')
        .select(
          `
          id,
          stripe_session_id,
          customer_email,
          customer_name,
          customer_phone,
          packeta_point_id,
          packeta_shipment_id,
          delivery_method,
          delivery_address,
          delivery_city,
          delivery_postal_code,
          delivery_country,
          items,
          status,
          amount_total,
          shipping_amount,
          created_at,
          updated_at,
          label_printed_at,
          label_printed_count
        `
        )
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchQuery.trim()) {
        query = query.or(
          `id.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%,customer_email.ilike.%${searchQuery}%,customer_phone.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      // Enhance orders with additional data
      const enhancedOrders = (data || []).map((order) => ({
        ...order,
        packeta_tracking_number: null, // TODO: Get from Packeta API
        packeta_status: null, // TODO: Get from Packeta API
        last_email_sent: null, // TODO: Get from email logs
        email_count: 0, // TODO: Count from email logs
        notes: null, // TODO: Add notes field to orders table
      }));

      setOrders(enhancedOrders);
    } catch (e: unknown) {
      console.error('Load orders error:', e);
      setError(e instanceof Error ? e.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new Error(error.message || 'Update failed');

      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Update failed');
    }
  };

  const createPacketaShipment = async (orderId: string) => {
    try {
      setLoading(true);

      const response = await fetch('/api/admin/packeta/create-shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      await updateStatus(orderId, 'shipped');
      alert(`Zásilka vytvořena! Packeta ID: ${data.packetaId}`);
      await loadOrders();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  const printLabel = (orderId: string) => {
    const url = `/api/admin/packeta/print-label/${orderId}?direct=true`;
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

  const StatusBadge = React.memo(({ status }: { status: string }) => {
    const statusConfig = {
      new: { className: 'bg-gray-100 text-gray-800', label: 'Nová', icon: Clock },
      paid: { className: 'bg-green-100 text-green-800', label: 'Zaplaceno', icon: CheckCircle },
      processing: {
        className: 'bg-yellow-100 text-yellow-800',
        label: 'Zpracovává se',
        icon: Package,
      },
      shipped: { className: 'bg-blue-100 text-blue-800', label: 'Odesláno', icon: Truck },
      delivered: {
        className: 'bg-purple-100 text-purple-800',
        label: 'Doručeno',
        icon: CheckCircle,
      },
      cancelled: { className: 'bg-red-100 text-red-800', label: 'Zrušeno', icon: AlertCircle },
      refunded: { className: 'bg-orange-100 text-orange-800', label: 'Vráceno', icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.new;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} border-0`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  });

  StatusBadge.displayName = 'StatusBadge';

  const statuses = useMemo(
    () => [
      'new',
      'paid',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded',
    ] as const,
    []
  );
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    statuses.forEach((status) => {
      counts[status] = orders.filter((o) => o.status === status).length;
    });
    return counts;
  }, [orders, statuses]);

  const handleRowClick = useCallback(
    (orderId: string) => {
      onOrderClick?.(orderId);
    },
    [onOrderClick]
  );

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
      {/* Enhanced Responsive Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-4">
        {Object.entries(statusCounts).map(([status, count]) => {
          const statusConfig = {
            all: { label: 'Celkem', color: 'text-blue-600' },
            new: { label: 'Nové', color: 'text-gray-600' },
            paid: { label: 'Zaplaceno', color: 'text-green-600' },
            processing: { label: 'Zpracovávají se', color: 'text-yellow-600' },
            shipped: { label: 'Odesláno', color: 'text-blue-600' },
            delivered: { label: 'Doručeno', color: 'text-purple-600' },
            cancelled: { label: 'Zrušeno', color: 'text-red-600' },
            refunded: { label: 'Vráceno', color: 'text-orange-600' },
          };

          const config = statusConfig[status as keyof typeof statusConfig];
          if (!config) return null;

          return (
            <Card
              key={status}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => setStatusFilter(status)}
            >
              <CardContent className="p-3 sm:p-4 text-center">
                <div className={`text-xl sm:text-2xl font-bold ${config.color}`}>{count}</div>
                <div className="text-xs sm:text-sm text-muted-foreground truncate">
                  {config.label}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enhanced Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>Konsolidované objednávky ({orders.length})</span>
              {selectedOrders.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Vybráno: {selectedOrders.size}
                  </span>
                  <Button onClick={() => setSelectedOrders(new Set())} variant="outline" size="sm">
                    Zrušit výběr
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={loadOrders} variant="outline" size="sm" disabled={loading}>
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
          {/* Enhanced Responsive Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Hledat podle ID, jména, emailu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny ({statusCounts.all})</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === 'new'
                      ? 'Nové'
                      : status === 'paid'
                        ? 'Zaplacené'
                        : status === 'processing'
                          ? 'Zpracovávají se'
                          : status === 'shipped'
                            ? 'Odesláno'
                            : status === 'delivered'
                              ? 'Doručeno'
                              : status === 'cancelled'
                                ? 'Zrušeno'
                                : status === 'refunded'
                                  ? 'Vráceno'
                                  : status}{' '}
                    ({statusCounts[status]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-4">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              {error}
            </div>
          )}

          {/* Enhanced Responsive Table */}
          <div className="relative border rounded-lg overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
              <Table
                className="min-w-full"
                style={{
                  scrollBehavior: 'smooth',
                }}
              >
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="sticky left-0 bg-muted/30 z-10 w-12 min-w-12">
                      <Checkbox
                        checked={selectedOrders.size === orders.length && orders.length > 0}
                        onCheckedChange={() => {
                          if (selectedOrders.size === orders.length) {
                            setSelectedOrders(new Set());
                          } else {
                            setSelectedOrders(new Set(orders.map((o) => o.id)));
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="sticky left-12 bg-muted/30 z-10 font-semibold min-w-[140px]">
                      Objednávka
                    </TableHead>
                    <TableHead className="font-semibold min-w-[180px]">Zákazník</TableHead>
                    <TableHead className="font-semibold min-w-[120px] hidden md:table-cell">
                      Produkty
                    </TableHead>
                    <TableHead className="font-semibold min-w-[120px]">Status</TableHead>
                    <TableHead className="font-semibold min-w-[120px]">Platba</TableHead>
                    <TableHead className="font-semibold min-w-[140px] hidden lg:table-cell">
                      Doprava
                    </TableHead>
                    <TableHead className="font-semibold min-w-[110px] hidden xl:table-cell">
                      Datum
                    </TableHead>
                    <TableHead className="sticky right-0 bg-muted/30 z-10 font-semibold w-16 min-w-16">
                      Akce
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {searchQuery || statusFilter !== 'all'
                          ? 'Žádné objednávky nenalezeny pro zadané filtry'
                          : 'Zatím žádné objednávky'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => {
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
                          className={`hover:bg-muted/50 touch-manipulation ${selectedOrders.has(order.id) ? 'bg-muted/30' : ''} cursor-pointer`}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleRowClick(order.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleRowClick(order.id);
                            }
                          }}
                        >
                          {/* Sticky Checkbox */}
                          <TableCell
                            className="sticky left-0 bg-background z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedOrders.has(order.id)}
                              onCheckedChange={() => toggleOrderSelection(order.id)}
                            />
                          </TableCell>

                          {/* Sticky Order Info */}
                          <TableCell className="sticky left-12 bg-background z-10">
                            <div className="space-y-1 min-w-[130px]">
                              <div className="font-mono font-bold text-primary text-sm">
                                {formatOrderId(order.id)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </TableCell>

                          {/* Customer */}
                          <TableCell>
                            <div className="space-y-1 min-w-[160px]">
                              <div className="font-medium text-sm truncate">
                                {order.customer_name || 'Nezadáno'}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {order.customer_email}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                {order.customer_email && (
                                  <a
                                    href={`mailto:${order.customer_email}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-blue-600 hover:text-blue-800 p-1"
                                  >
                                    <Mail className="w-3 h-3" />
                                  </a>
                                )}
                                {order.customer_phone && (
                                  <a
                                    href={`tel:${order.customer_phone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-blue-600 hover:text-blue-800 p-1"
                                  >
                                    <Phone className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Products - Hidden on mobile */}
                          <TableCell className="hidden md:table-cell">
                            <div className="space-y-1 min-w-[100px]">
                              <div className="text-sm font-medium">{items.length} položek</div>
                              <div className="text-xs text-muted-foreground">
                                {items.slice(0, 1).map((item, index) => (
                                  <div key={index} className="truncate">
                                    {String(
                                      (item as Record<string, unknown>)?.name ||
                                        (item as Record<string, unknown>)?.description ||
                                        'Položka'
                                    )}
                                  </div>
                                ))}
                                {items.length > 1 && <div>+{items.length - 1} dalších</div>}
                              </div>
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="min-w-[100px]">
                              <Select
                                value={order.status}
                                onValueChange={(status) => updateStatus(order.id, status)}
                              >
                                <SelectTrigger className="w-full h-8 border-0 hover:bg-muted">
                                  <SelectValue asChild>
                                    <StatusBadge status={order.status} />
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {statuses.map((status) => (
                                    <SelectItem key={status} value={status}>
                                      <div className="flex items-center gap-2">
                                        <StatusBadge status={status} />
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>

                          {/* Payment */}
                          <TableCell>
                            <div className="space-y-1 min-w-[100px]">
                              <div className="font-semibold text-sm">
                                {order.amount_total
                                  ? `${(order.amount_total / 100).toFixed(2)} Kč`
                                  : '-'}
                              </div>
                              {order.stripe_session_id && (
                                <div className="flex items-center gap-1 text-xs text-green-600">
                                  <CreditCard className="w-3 h-3" />
                                  <span>Stripe</span>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Delivery - Hidden on tablet */}
                          <TableCell className="hidden lg:table-cell">
                            <div className="space-y-1 min-w-[120px]">
                              <div className="flex items-center gap-1 text-sm">
                                {order.delivery_method === 'home_delivery' ? (
                                  <>
                                    <Truck className="w-3 h-3 text-green-600" />
                                    <span className="text-green-600 text-xs">Domů</span>
                                  </>
                                ) : (
                                  <>
                                    <Package className="w-3 h-3 text-blue-600" />
                                    <span className="text-blue-600 text-xs">Výdejní místo</span>
                                  </>
                                )}
                              </div>
                              {order.packeta_shipment_id && (
                                <div className="flex items-center gap-1 text-xs text-orange-600">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>#{order.packeta_shipment_id}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Date - Hidden on large screens */}
                          <TableCell className="hidden xl:table-cell">
                            <div className="space-y-1 min-w-[90px]">
                              <div className="text-sm">
                                {new Date(order.created_at).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(order.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          </TableCell>

                          {/* Sticky Actions */}
                          <TableCell
                            className="sticky right-0 bg-background z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1">
                              {/* Quick actions inline */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Detail objednávky"
                                onClick={() => onOrderClick?.(order.id)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>

                              {order.packeta_point_id && order.status === 'paid' && !order.packeta_shipment_id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Vytvořit zásilku"
                                  onClick={() => createPacketaShipment(order.id)}
                                >
                                  <Package className="w-4 h-4" />
                                </Button>
                              )}

                              {order.packeta_shipment_id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Tisknout štítek"
                                  onClick={() => printLabel(order.id)}
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                              )}

                              {/* Kebab menu for more actions */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => onOrderClick?.(order.id)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Detail objednávky
                                  </DropdownMenuItem>

                                  {onCommunicateWith && (
                                    <DropdownMenuItem onClick={() => onCommunicateWith(order.id)}>
                                      <MessageSquare className="w-4 h-4 mr-2" />
                                      Komunikace
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator />

                                  {order.packeta_point_id && order.status === 'paid' && !order.packeta_shipment_id && (
                                    <DropdownMenuItem onClick={() => createPacketaShipment(order.id)}>
                                      <Package className="w-4 h-4 mr-2" />
                                      Vytvořit zásilku
                                    </DropdownMenuItem>
                                  )}

                                  {order.packeta_shipment_id && (
                                    <DropdownMenuItem onClick={() => printLabel(order.id)}>
                                      <Printer className="w-4 h-4 mr-2" />
                                      Tisknout štítek
                                    </DropdownMenuItem>
                                  )}

                                  {order.stripe_session_id && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        window.open(
                                          `https://dashboard.stripe.com/payments/${order.stripe_session_id}`,
                                          '_blank'
                                        )
                                      }
                                    >
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      Stripe Dashboard
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
