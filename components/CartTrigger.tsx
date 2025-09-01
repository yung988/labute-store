'use client';

import { ShoppingBag } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { CartSidebar } from '@/components/CartSidebar';

export function CartTrigger() {
  const { totalItems, isSidebarOpen, setIsSidebarOpen } = useCart();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative hover:bg-gray-50 transition-colors"
        onClick={() => setIsSidebarOpen(true)}
      >
        <ShoppingBag className="h-5 w-5 text-gray-700" />
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {totalItems}
          </span>
        )}
      </Button>

      <CartSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
}
