'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  ArrowUpDown,
  MoreHorizontal,
  Package,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type Order = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  status: string;
  amount_total: number | null;
  created_at: string;
  packeta_shipment_id: string | null;
  packeta_tracking_url: string | null;
  delivery_method: string | null;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'paid':
    case 'new':
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
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getDaysOld = (dateString: string) => {
  const now = new Date();
  const created = new Date(dateString);
  const diffTime = Math.abs(now.getTime() - created.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const columns: ColumnDef<Order>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => (
      <div className="font-mono text-xs">{row.getValue('id')?.toString().slice(-8)}</div>
    ),
  },
  {
    accessorKey: 'customer_email',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Zákazník
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const email = row.getValue('customer_email') as string;
      const name = row.original.customer_name;
      return (
        <div>
          <div className="font-medium">{name || 'Nezadáno'}</div>
          <div className="text-sm text-muted-foreground">{email}</div>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => getStatusBadge(row.getValue('status')),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'amount_total',
    header: () => <div className="text-right">Částka</div>,
    cell: ({ row }) => {
      const amount = row.getValue('amount_total') as number;
      if (!amount) return <div className="text-right">-</div>;

      const formatted = new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
      }).format(amount / 100);

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Vytvořeno
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue('created_at'));
      const daysOld = getDaysOld(row.getValue('created_at'));

      return (
        <div>
          <div className="text-sm">{date.toLocaleDateString('cs-CZ')}</div>
          <div className="text-xs text-muted-foreground">
            {date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
          </div>
          {daysOld > 1 && (
            <div className="text-xs text-orange-600 font-medium">
              {daysOld} {daysOld === 1 ? 'den' : daysOld < 5 ? 'dny' : 'dní'} staré
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'packeta_shipment_id',
    header: 'Zásilka',
    cell: ({ row }) => {
      const shipmentId = row.getValue('packeta_shipment_id') as string;
      const trackingUrl = row.original.packeta_tracking_url;

      if (!shipmentId) {
        return (
          <Badge variant="outline" className="text-orange-600">
            Nevytvořena
          </Badge>
        );
      }

      return (
        <div>
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Package className="w-3 h-3 mr-1" />
            {shipmentId}
          </Badge>
          {trackingUrl && (
            <div className="text-xs text-muted-foreground mt-1">Tracking dostupný</div>
          )}
        </div>
      );
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const order = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Otevřít menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Akce</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(order.id)}>
              Kopírovat ID objednávky
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Zobrazit detail</DropdownMenuItem>
            <DropdownMenuItem>Zobrazit zákazníka</DropdownMenuItem>
            {!order.packeta_shipment_id && (order.status === 'paid' || order.status === 'new') && (
              <DropdownMenuItem>Vytvořit zásilku</DropdownMenuItem>
            )}
            {order.status === 'processing' && (
              <DropdownMenuItem>Označit jako odesláno</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
