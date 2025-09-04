'use client';

import { useState } from 'react';

export const dynamic = 'force-dynamic';
import OrderList from '@/components/admin/orders/OrderList';
import OrderFiltersComponent, { OrderFilters } from '@/components/admin/orders/OrderFilters';

export default function OrdersPage() {
  const [filters, setFilters] = useState<OrderFilters>({});

  const handleFiltersChange = (newFilters: OrderFilters) => {
    setFilters(newFilters);
    // Here you would typically refetch orders with new filters
    // For now, we'll let OrderList component handle the API calls
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Správa objednávek</h1>
      </div>

      <OrderFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />

      <OrderList />
    </div>
  );
}
