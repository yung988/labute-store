'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Command } from 'cmdk';
import {
  Search,
  ShoppingCart,
  BarChart3,
  Truck,
  Mail,
  Plus,
  Download,
  FileText,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface Order {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  status: string;
  amount_total: number | null;
  created_at: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (section: string, orderId?: string) => void;
}

export default function CommandPalette({ open, onOpenChange, onNavigate }: CommandPaletteProps) {
  const [value, setValue] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const searchOrders = useCallback(async (query: string) => {
    if (!query.trim()) {
      setOrders([]);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, customer_email, status, amount_total, created_at')
        .or(`id.ilike.%${query}%,customer_name.ilike.%${query}%,customer_email.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setOrders(data);
      }
    } catch (error) {
      console.error('Search orders error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && value) {
      const timeoutId = setTimeout(() => {
        searchOrders(value);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setOrders([]);
    }
  }, [value, open, searchOrders]);

  const handleSelect = (callback: () => void) => {
    callback();
    onOpenChange(false);
    setValue('');
  };

  const adminActions = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Přejít na přehledovou stránku',
      icon: BarChart3,
      onSelect: () => onNavigate('dashboard'),
    },
    {
      id: 'orders',
      title: 'Objednávky',
      description: 'Zobrazit všechny objednávky',
      icon: ShoppingCart,
      onSelect: () => onNavigate('orders'),
    },
    {
      id: 'emails',
      title: 'Emaily',
      description: 'Zobrazit emailovou komunikaci',
      icon: Mail,
      onSelect: () => onNavigate('emails'),
    },
    {
      id: 'packeta',
      title: 'Packeta',
      description: 'Správa zásilek',
      icon: Truck,
      onSelect: () => onNavigate('packeta'),
    },
    {
      id: 'emails',
      title: 'Emailová komunikace',
      description: 'Přehled odeslaných emailů',
      icon: Mail,
      onSelect: () => onNavigate('emails'),
    },
  ];

  const quickActions = [
    {
      id: 'new-order',
      title: 'Nová objednávka',
      description: 'Vytvořit novou objednávku ručně',
      icon: Plus,
      onSelect: () => {
        // TODO: Implement new order creation
        console.log('New order creation not implemented yet');
      },
    },
    {
      id: 'export-data',
      title: 'Export dat',
      description: 'Exportovat objednávky do CSV/Excel',
      icon: Download,
      onSelect: () => {
        // TODO: Implement data export
        console.log('Data export not implemented yet');
      },
    },
    {
      id: 'generate-report',
      title: 'Generovat report',
      description: 'Vytvořit přehledový report',
      icon: FileText,
      onSelect: () => {
        // TODO: Implement report generation
        console.log('Report generation not implemented yet');
      },
    },
  ];

  const formatOrderId = (id: string) => {
    return `#${id.substring(0, 8).toUpperCase()}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }
    > = {
      paid: { variant: 'default', label: 'Zaplaceno' },
      shipped: { variant: 'secondary', label: 'Odesláno' },
      cancelled: { variant: 'destructive', label: 'Zrušeno' },
      processing: { variant: 'outline', label: 'Zpracovává se' },
      new: { variant: 'outline', label: 'Nová' },
    };

    const config = statusConfig[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl z-[9999]">
        <Command className="rounded-lg border-none shadow-none" shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              value={value}
              onValueChange={setValue}
              placeholder="Vyhledat objednávku, navigovat nebo provést akci..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0"
            />
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {loading ? 'Hledání...' : 'Žádné výsledky nenalezeny.'}
            </Command.Empty>

            {/* Orders Search Results */}
            {orders.length > 0 && (
              <Command.Group heading="Objednávky">
                {orders.map((order) => (
                  <Command.Item
                    key={order.id}
                    value={`order-${order.id}`}
                    onSelect={() => handleSelect(() => onNavigate('order-detail', order.id))}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-sm hover:bg-accent"
                  >
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-sm">
                          {formatOrderId(order.id)}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{order.customer_name || order.customer_email}</span>
                        {order.amount_total && (
                          <>
                            <span>•</span>
                            <span>{(order.amount_total / 100).toFixed(2)} Kč</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Admin Navigation */}
            <Command.Group heading="Navigace">
              {adminActions.map((action) => (
                <Command.Item
                  key={action.id}
                  value={action.title}
                  onSelect={() => handleSelect(action.onSelect)}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-sm hover:bg-accent"
                >
                  <action.icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-sm text-muted-foreground">{action.description}</div>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Quick Actions */}
            <Command.Group heading="Rychlé akce">
              {quickActions.map((action) => (
                <Command.Item
                  key={action.id}
                  value={action.title}
                  onSelect={() => handleSelect(action.onSelect)}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-sm hover:bg-accent"
                >
                  <action.icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-sm text-muted-foreground">{action.description}</div>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
