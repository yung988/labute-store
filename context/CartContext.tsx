'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

// Definice typů pro položky v košíku
export type CartItem = {
  id: string;
  productId: string;
  variantId: string;
  priceId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  size?: string;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
  openDropdown: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  openSidebar: () => void;
  isInitialized: boolean;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart musí být použit uvnitř CartProvider');
  }
  return context;
};

// Compatibility layer for Spree integration
export const useSpreeCart = () => {
  const cartContext = useContext(CartContext);
  if (!cartContext) {
    throw new Error('useSpreeCart musí být použit uvnitř CartProvider');
  }

  // Convert local cart to Spree format
  const cart = {
    line_items: cartContext.items.map((item) => ({
      id: item.id,
      productId: item.productId, // Přidáme productId pro inventory tracking
      variant: {
        name: item.name,
        price: item.price.toString(),
        option_values: item.size ? [{ name: 'size', presentation: item.size }] : [],
        images: item.image ? [{ url: item.image }] : [],
      },
      product: {
        name: item.name,
        images: item.image ? [{ url: item.image }] : [],
      },
      quantity: item.quantity,
      total: (item.price * item.quantity).toString(),
    })),
    total: cartContext.totalPrice.toString(),
    number: `local-${Date.now()}`,
  };

  const updateItemQuantity = (lineItemId: string, quantity: number) => {
    cartContext.updateQuantity(lineItemId, quantity);
  };

  const removeItem = (lineItemId: string) => {
    cartContext.removeItem(lineItemId);
  };

  return {
    cart,
    loading: !cartContext.isInitialized,
    updateItemQuantity,
    removeItem,
  };
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sessionId] = useState(() => {
    // Generate unique session ID for cart tracking
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('cart-session-id');
      if (!id) {
        id = `cart-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem('cart-session-id', id);
      }
      return id;
    }
    return `cart-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  });

  // Načtení košíku z localStorage při načtení stránky
  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        setItems(JSON.parse(storedCart));
      } catch (error) {
        console.error('Chyba při načítání košíku:', error);
        localStorage.removeItem('cart');
      }
    }
    setIsInitialized(true);
  }, []);

  // Uložení košíku do localStorage při změně a poslech storage událostí
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('cart', JSON.stringify(items));

      // Track cart on server for abandoned cart detection
      if (items.length > 0) {
        trackCartOnServer();
      }
    }
  }, [items, isInitialized]);

  // Function to track cart on server
  const trackCartOnServer = async () => {
    try {
      // Get customer info from localStorage if available (from checkout form)
      const customerEmail = localStorage.getItem('customer-email');
      const customerName = localStorage.getItem('customer-name');

      await fetch('/api/cart/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            size: item.size,
            image: item.image,
          })),
          customerEmail,
          customerName,
          totalAmount: totalPrice,
        }),
      });
    } catch (error) {
      // Silently fail - cart tracking is not critical
      console.debug('Cart tracking failed:', error);
    }
  };

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key !== 'cart') return;
      try {
        const stored = localStorage.getItem('cart');
        if (!stored) {
          setItems([]);
          return;
        }
        const parsed = JSON.parse(stored) as CartItem[];
        setItems(parsed);
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Spočítání celkového počtu položek v košíku
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  // Spočítání celkové ceny
  const totalPrice = items.reduce((total, item) => total + item.price * item.quantity, 0);

  // Přidání položky do košíku
  const addItem = (newItem: Omit<CartItem, 'id'>) => {
    setItems((currentItems) => {
      // Kontrola, zda položka s daným productId a size již existuje
      const existingItemIndex = currentItems.findIndex(
        (item) => item.productId === newItem.productId && item.size === newItem.size
      );

      if (existingItemIndex !== -1) {
        // Aktualizace existující položky
        const updatedItems = [...currentItems];
        updatedItems[existingItemIndex].quantity += newItem.quantity;
        return updatedItems;
      }

      // Přidání nové položky s jedinečným ID kombinujícím variantId a size
      const uniqueId = `${newItem.variantId}-${newItem.size || 'no-size'}`;
      return [...currentItems, { ...newItem, id: uniqueId }];
    });

    // Toast notifikace odstraněna

    // Otevřít sidebar
    setIsSidebarOpen(true);
  };

  // Odstranění položky z košíku
  const removeItem = (id: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  };

  // Aktualizace množství položky
  const updateQuantity = (id: string, quantity: number) => {
    setItems((currentItems) => {
      const itemIndex = currentItems.findIndex((item) => item.id === id);
      if (itemIndex === -1) return currentItems;

      // Pokud je množství 0, odstraníme položku
      if (quantity <= 0) {
        return currentItems.filter((_, index) => index !== itemIndex);
      }

      const updatedItems = [...currentItems];
      updatedItems[itemIndex].quantity = quantity;
      return updatedItems;
    });
  };

  // Vyčištění košíku
  const clearCart = () => {
    const empty: CartItem[] = [];
    setItems(empty);
    try {
      localStorage.setItem('cart', JSON.stringify(empty));
    } catch {}
    try {
      const event = new StorageEvent('storage', { key: 'cart', newValue: JSON.stringify(empty) });
      window.dispatchEvent(event);
    } catch {}

    // Mark cart as recovered on server
    markCartAsRecovered();
  };

  // Function to mark cart as recovered (order completed)
  const markCartAsRecovered = async () => {
    try {
      await fetch(`/api/cart/track?sessionId=${sessionId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.debug('Cart recovery tracking failed:', error);
    }
  };

  // Funkce pro otevření dropdown
  const openDropdown = () => {
    setIsDropdownOpen(true);
  };

  // Funkce pro otevření sidebar
  const openSidebar = () => {
    setIsSidebarOpen(true);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isDropdownOpen,
        setIsDropdownOpen,
        openDropdown,
        isSidebarOpen,
        setIsSidebarOpen,
        openSidebar,
        isInitialized,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
