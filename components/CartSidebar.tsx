"use client";

import { X, ShoppingBag, Minus, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/utils";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const { items, totalItems, totalPrice, removeItem, updateQuantity } = useCart();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ zIndex: 999999 }}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-screen w-full max-w-md bg-white shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ zIndex: 1000000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-light tracking-wide uppercase text-gray-900">
              Košík ({totalItems})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-50 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 min-h-0">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-light text-gray-900 mb-2">Váš košík je prázdný</h3>
              <p className="text-sm text-gray-500 mb-6">Přidejte si produkty z naší kolekce</p>
              <Button
                onClick={onClose}
                variant="outline"
                className="uppercase tracking-wide text-xs font-medium rounded-none"
              >
                Pokračovat v nákupu
              </Button>
            </div>
          ) : (
            <>
              {/* Items */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                {items.map((item, index) => (
                  <div
                    key={`${item.id}-${item.size || "no-size"}-${index}`}
                    className="flex gap-4 pb-6 border-b border-gray-100 last:border-b-0"
                  >
                    {item.image && (
                      <div className="relative w-20 h-20 bg-gray-50 rounded overflow-hidden">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <h3 className="text-sm font-medium text-gray-900 leading-tight">
                        {item.name}
                      </h3>
                      {item.size && (
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Velikost: {item.size}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => {
                              if (item.quantity === 1) {
                                removeItem(item.id);
                              } else {
                                updateQuantity(item.id, item.quantity - 1);
                              }
                            }}
                            className="w-8 h-8 flex items-center justify-center border border-gray-200 hover:border-gray-300 transition-colors rounded-none"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center border border-gray-200 hover:border-gray-300 transition-colors rounded-none"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors uppercase tracking-wide"
                        >
                          Odebrat
                        </button>
                      </div>
                      <div className="text-sm font-medium text-right">
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-light text-gray-700 uppercase tracking-wide">
                      Celkem
                    </span>
                    <span className="text-lg font-medium text-gray-900">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <Link href="/cart" onClick={onClose}>
                      <Button className="w-full bg-gray-900 hover:bg-black text-white uppercase tracking-wide text-xs font-medium py-3 rounded-none">
                        Pokračovat k objednávce
                      </Button>
                    </Link>
                    <Button
                      onClick={onClose}
                      variant="ghost"
                      className="w-full text-gray-600 hover:text-gray-900 uppercase tracking-wide text-xs font-medium rounded-none"
                    >
                      Pokračovat v nákupu
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}