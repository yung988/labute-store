'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// Textarea component not available, using native textarea
import { Separator } from '@/components/ui/separator';
import { Order } from './columns';
import { Package, User, MapPin, CreditCard, Clock, Save } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface OrderDetailProps {
  orderId: string;
  onClose?: () => void;
}

export default function OrderDetail({ orderId, onClose }: OrderDetailProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }
      const data = await response.json();
      setOrder(data.order);
      setAdminNotes(data.order.admin_notes || '');
      setInternalNotes(data.order.internal_notes || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      await fetchOrder(); // Refresh order data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const updateNotes = async () => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_notes: adminNotes,
          internal_notes: internalNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notes');
      }

      setEditingNotes(false);
      await fetchOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notes');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-blue-100 text-blue-800">Nová</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Čeká na zpracování</Badge>;
      case 'processing':
        return <Badge className="bg-orange-100 text-orange-800">Zpracovává se</Badge>;
      case 'shipped':
        return <Badge className="bg-purple-100 text-purple-800">Odesláno</Badge>;
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800">Doručeno</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Zrušeno</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Načítání detailu objednávky...</div>
        </CardContent>
      </Card>
    );
  }

  if (error || !order) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">{error || 'Objednávka nenalezena'}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Objednávka #{order.id.slice(-8)}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Vytvořeno {new Date(order.created_at).toLocaleString('cs-CZ')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(order.status)}
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  Zavřít
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Položky objednávky</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.isArray(order.items) &&
              order.items.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <p className="font-medium">{item.product_name || 'Produkt'}</p>
                    <p className="text-sm text-muted-foreground">
                      Množství: {item.quantity} {item.size && `| Velikost: ${item.size}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {(item.price_cents / 100).toLocaleString('cs-CZ')} Kč
                    </p>
                  </div>
                </div>
              ))}
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between items-center">
            <span className="font-medium">Celkem:</span>
            <span className="text-lg font-bold">
              {order.amount_total ? (order.amount_total / 100).toLocaleString('cs-CZ') : '0'} Kč
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informace o zákazníkovi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium">{order.customer_name}</p>
              <p className="text-sm text-muted-foreground">{order.customer_email}</p>
              {order.customer_phone && (
                <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
              )}
            </div>
            <div>
              <p className="font-medium">ID zákazníka</p>
              <p className="text-sm text-muted-foreground">{order.customer_id || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Dodací adresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p>{order.delivery_address}</p>
              <p>
                {order.delivery_city}, {order.delivery_postal_code}
              </p>
              <p>{order.delivery_country}</p>
            </div>
          </CardContent>
        </Card>

        {(order.billing_address || order.billing_city) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Fakturační adresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p>{order.billing_address || order.delivery_address}</p>
                <p>
                  {order.billing_city || order.delivery_city},{' '}
                  {order.billing_postal_code || order.delivery_postal_code}
                </p>
                <p>{order.billing_country || order.delivery_country}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Status Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Správa statusu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={order.status} onValueChange={updateOrderStatus} disabled={updating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Nová</SelectItem>
                  <SelectItem value="pending">Čeká na zpracování</SelectItem>
                  <SelectItem value="processing">Zpracovává se</SelectItem>
                  <SelectItem value="shipped">Odesláno</SelectItem>
                  <SelectItem value="delivered">Doručeno</SelectItem>
                  <SelectItem value="cancelled">Zrušeno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {updating && <div className="text-sm text-muted-foreground">Aktualizace...</div>}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Poznámky</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Poznámky pro zákazníka</label>
              {editingNotes ? (
                <textarea
                  value={adminNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setAdminNotes(e.target.value)
                  }
                  placeholder="Poznámky viditelné pro zákazníka..."
                  className="w-full p-2 border rounded-md resize-none"
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{adminNotes || 'Žádné poznámky'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Interní poznámky</label>
              {editingNotes ? (
                <textarea
                  value={internalNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setInternalNotes(e.target.value)
                  }
                  placeholder="Interní poznámky viditelné pouze adminům..."
                  className="w-full p-2 border rounded-md resize-none"
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {internalNotes || 'Žádné interní poznámky'}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {editingNotes ? (
                <>
                  <Button onClick={updateNotes} disabled={updating}>
                    <Save className="w-4 h-4 mr-2" />
                    Uložit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingNotes(false);
                      setAdminNotes(order.admin_notes || '');
                      setInternalNotes(order.internal_notes || '');
                    }}
                  >
                    Zrušit
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setEditingNotes(true)}>
                  Upravit poznámky
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
