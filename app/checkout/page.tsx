"use client";

import { ChevronDown, ChevronUp, Minus, Package, Plus, X, MapPin, Search } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ZasilkovnaWidget from "@/components/checkout/ZasilkovnaWidget";
import { useSpreeCart } from "@/context/CartContext";
import StripePaymentElement from "@/components/StripePaymentElement";

import type { PacketaPoint } from "@/lib/packeta";

type ZasilkovnaPoint = PacketaPoint;

interface ShippingMethod {
  id: string;
  name: string;
  code: string;
  description?: string;
  cost: number;
  currency: string;
  is_packeta: boolean;
  delivery_type: 'pickup_point' | 'home_delivery' | 'unknown';
}

interface SelectedBranch {
  id: string;
  name: string;
  address: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  image?: string;
}

interface CartSummaryProps {
  cartItems: CartItem[];
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  subtotal: number;
  deliveryPrice: number;
  total: number;
  isMobile?: boolean;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

// Komponenta košíku
const CartSummary = ({
  cartItems,
  updateQuantity,
  removeItem,
  subtotal,
  deliveryPrice,
  total,
  isMobile = false,
  isCollapsed = false,
  toggleCollapse,
}: CartSummaryProps) => {
  if (isMobile && isCollapsed) {
    return (
      <div className="sticky top-0 z-50 bg-white border-b border-gray-300">
        <button
          type="button"
          onClick={toggleCollapse}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div>
            <p className="text-xs font-medium tracking-wide uppercase">
              Zobrazit souhrn objednávky
            </p>
            <p className="text-xs text-gray-600 mt-1">{total.toLocaleString("cs-CZ")} Kč</p>
          </div>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`bg-white ${isMobile ? "border-b border-gray-300" : "border border-gray-300"} ${!isMobile ? "sticky top-0 h-screen overflow-y-auto" : ""}`}
    >
      {isMobile && (
        <div className="sticky top-0 bg-white border-b border-gray-300 p-4">
          <button
            type="button"
            onClick={toggleCollapse}
            className="w-full flex items-center justify-between text-left"
          >
            <p className="text-xs font-medium tracking-wide uppercase">Souhrn objednávky</p>
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="p-6">
        {!isMobile && (
          <h2 className="text-xs font-medium tracking-wide uppercase mb-6">Souhrn objednávky</h2>
        )}

        {/* Položky košíku */}
        <div className="space-y-4 mb-6">
          {cartItems.map((item, index) => (
            <div
              key={`${item.id}-${item.size || "no-size"}-${index}`}
              className="flex items-start gap-4 pb-4 border-b border-gray-200"
            >
              <div className="relative w-16 h-16 bg-gray-100 flex-shrink-0">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-contain"
                    onError={(e) => {
                      console.log('Image failed to load:', item.image);
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-medium truncate">{item.name}</h3>
                {item.size && <p className="text-xs text-gray-600 mt-1">Velikost: {item.size}</p>}
                <p className="text-xs font-medium mt-1">{item.price.toLocaleString("cs-CZ")} Kč</p>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-6 h-6 flex items-center justify-center border border-gray-300 hover:bg-gray-50"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-xs font-medium">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-6 h-6 flex items-center justify-center border border-gray-300 hover:bg-gray-50"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-black ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-medium">
                  {(item.price * item.quantity).toLocaleString("cs-CZ")} Kč
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Souhrn cen */}
        <div className="border-t border-gray-300 pt-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span>Mezisoučet</span>
            <span>{subtotal.toLocaleString("cs-CZ")} Kč</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Doprava</span>
            <span>{deliveryPrice.toLocaleString("cs-CZ")} Kč</span>
          </div>
          <div className="flex justify-between text-sm font-medium pt-2 border-t border-gray-300">
            <span>Celkem</span>
            <span>{total.toLocaleString("cs-CZ")} Kč</span>
          </div>
        </div>

        {cartItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-xs">Váš košík je prázdný</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Komponenta checkout formuláře
function CheckoutForm() {
  const { cart, loading, updateItemQuantity, removeItem } = useSpreeCart();
  const router = useRouter();
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<ZasilkovnaPoint | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isCartCollapsed, setIsCartCollapsed] = useState(true);
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "home_delivery">("pickup");
  const [showEmptyModal, setShowEmptyModal] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
  });

  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  // Detekce mobilního zařízení
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Načtení shipping methods z API
  useEffect(() => {
    const fetchShippingMethods = async () => {
      try {
        const response = await fetch('/api/spree/storefront/shipping_methods');
        if (response.ok) {
          const data = await response.json();
          // Transform Spree data to our interface
          const methods: ShippingMethod[] = data.shipping_methods?.map((method: {
            id: string;
            name: string;
            code: string;
            description?: string;
            cost?: number;
            currency?: string;
          }) => ({
            id: method.id,
            name: method.name,
            code: method.code,
            description: method.description,
            cost: method.cost || 0,
            currency: method.currency || 'CZK',
            is_packeta: method.code?.includes('PACKETA') || method.name?.includes('Zásilkovna'),
            delivery_type: method.code === 'PACKETA_PICKUP' ? 'pickup_point' :
              method.code === 'PACKETA_HOME_DELIVERY' ? 'home_delivery' : 'unknown'
          })) || [];

          setShippingMethods(methods);
        }
      } catch (error) {
        console.error('Error fetching shipping methods:', error);
        // Fallback to hardcoded values
        setShippingMethods([
          {
            id: 'pickup',
            name: 'Zásilkovna - výdejní místo',
            code: 'PACKETA_PICKUP',
            cost: 79,
            currency: 'CZK',
            is_packeta: true,
            delivery_type: 'pickup_point'
          },
          {
            id: 'home_delivery',
            name: 'Zásilkovna - doručení domů',
            code: 'PACKETA_HOME_DELIVERY',
            cost: 149,
            currency: 'CZK',
            is_packeta: true,
            delivery_type: 'home_delivery'
          }
        ]);
      }
    };

    fetchShippingMethods();
  }, []);

  // API calls for Packeta branch management
  const savePacketaBranch = async (branch: SelectedBranch) => {
    try {
      const orderNumber = cart?.number;
      if (!orderNumber) return;

      const response = await fetch('/api/shipping/packeta/select-branch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_number: orderNumber,
          branch_id: branch.id,
          branch_name: branch.name,
          branch_address: branch.address
        })
      });

      if (!response.ok) {
        console.error('Failed to save branch selection');
      }
    } catch (error) {
      console.error('Error saving branch selection:', error);
    }
  };

  const clearPacketaBranch = async () => {
    try {
      const orderNumber = cart?.number;
      if (!orderNumber) return;

      await fetch(`/api/shipping/packeta/clear-branch/${orderNumber}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error clearing branch selection:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Address autocomplete
    if (name === 'address' && deliveryMethod === 'home_delivery') {
      searchAddress(value);
    }
  };

  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearchingAddress(true);

    try {
      // Use Mapbox Geocoding API for Czech addresses
      const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoieWVlemV6MjAyMCIsImEiOiJjbGV4YW1xaW0wM3FxM25xbzR5dW1xYW1xIn0.example';
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=cz&limit=5&access_token=${MAPBOX_ACCESS_TOKEN}`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const suggestions = data.features?.map((feature: any) =>
          feature.place_name || feature.text
        ).filter((suggestion: string) => suggestion && suggestion.length > 0) || [];

        setAddressSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } else {
        // Fallback to basic Czech city suggestions
        const basicSuggestions = [
          'Praha', 'Brno', 'Ostrava', 'Plzeň', 'Liberec', 'Olomouc', 'České Budějovice', 'Hradec Králové', 'Pardubice', 'Zlín'
        ].filter(city =>
          city.toLowerCase().includes(query.toLowerCase())
        ).map(city => `${query}, ${city}`);

        setAddressSuggestions(basicSuggestions);
        setShowSuggestions(basicSuggestions.length > 0);
      }
    } catch (error) {
      console.warn('Address search failed:', error);
      // Fallback to basic suggestions
      const basicSuggestions = [
        'Praha', 'Brno', 'Ostrava', 'Plzeň', 'Liberec'
      ].filter(city =>
        city.toLowerCase().includes(query.toLowerCase())
      ).map(city => `${query}, ${city}`);

      setAddressSuggestions(basicSuggestions);
      setShowSuggestions(basicSuggestions.length > 0);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const selectAddress = (address: string) => {
    // Parse address to fill city and postal code
    const parts = address.split(', ');
    if (parts.length >= 2) {
      const streetAddress = parts[0];
      const city = parts[1];
      const postalCode = parts[2] || '';

      setFormData(prev => ({
        ...prev,
        address: streetAddress,
        city: city,
        postalCode: postalCode
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        address: address
      }));
    }

    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  const validatePostalCode = (postalCode: string) => {
    // Czech postal code format: 123 45 or 12345
    const cleanCode = postalCode.replace(/\s/g, '');
    return /^\d{5}$/.test(cleanCode);
  };

  const formatPostalCode = (postalCode: string) => {
    // Format postal code as 123 45
    const cleanCode = postalCode.replace(/\s/g, '');
    if (cleanCode.length === 5) {
      return `${cleanCode.slice(0, 3)} ${cleanCode.slice(3)}`;
    }
    return postalCode;
  };

  const handleRemoveItem = (lineItemId: string) => {
    if (confirm("Opravdu chcete odstranit tuto položku z košíku?")) {
      removeItem(lineItemId);
    }
  };

  const handleQuantityChange = (lineItemId: string, quantity: number) => {
    updateItemQuantity(lineItemId, quantity);
  };

  // Pokud je košík prázdný, přesměruj zpět na obchod
  useEffect(() => {
    if (loading) return;
    const count = cart?.line_items?.length ?? 0;
    if (count === 0) {
      setShowEmptyModal(true);
      // Pokus o automatické přesměrování s malým zpožděním
      const t = setTimeout(() => router.push("/"), 800);
      return () => clearTimeout(t);
    }
  }, [loading, cart?.line_items?.length, router]);

  // Převod Spree cart dat do lokálního formátu
  const items: CartItem[] = cart?.line_items?.map((item) => ({
    id: item.id,
    name: item.variant.name || item.product.name,
    // Zobrazujeme v CZK (bez haléřů) – Stripe dostane haléře níže jako *100
    price: parseFloat(item.variant.price),
    quantity: item.quantity,
    size: item.variant.option_values.find(ov => ov.name.toLowerCase().includes('size'))?.presentation,
    // Zkusíme více zdrojů pro obrázky:
    // 1. Product obrázky (mohou být spolehlivější)
    // 2. Variant obrázky (pokud product nemá)
    // 3. undefined jako fallback (zobrazí se Package ikona)
    image: item.product.images?.[0]?.url || item.variant.images?.[0]?.url || undefined
  })) || [];

  // Ceny pro UI v CZK (ne v haléřích)
  const subtotal = parseFloat(cart?.total || '0');
  const selectedShippingMethod = shippingMethods.find(method =>
    (deliveryMethod === "pickup" && method.delivery_type === 'pickup_point') ||
    (deliveryMethod === "home_delivery" && method.delivery_type === 'home_delivery')
  );
  const deliveryPrice = selectedShippingMethod?.cost || (deliveryMethod === "pickup" ? 79 : 149);
  const total = subtotal + deliveryPrice;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
          <p className="text-xs text-gray-600 mt-2">Načítám košík...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {showEmptyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-white w-[90%] max-w-sm p-6 border border-gray-300 text-center">
            <h3 className="text-sm font-medium mb-2">Košík je prázdný</h3>
            <p className="text-xs text-gray-600 mb-4">Byli jste přesměrováni, nebo klikněte na tlačítko níže pro pokračování v nákupu.</p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full border-2 border-black bg-black text-white py-2 text-sm tracking-wide uppercase rounded-none"
            >
              Pokračovat v nákupu
            </button>
          </div>
        </div>
      )}
      {/* Mobile Cart Summary */}
      {isMobile && (
        <CartSummary
          cartItems={items}
          updateQuantity={handleQuantityChange}
          removeItem={handleRemoveItem}
          subtotal={subtotal}
          deliveryPrice={deliveryPrice}
          total={total}
          isMobile={true}
          isCollapsed={isCartCollapsed}
          toggleCollapse={() => setIsCartCollapsed(!isCartCollapsed)}
        />
      )}

      <div className="lg:grid lg:grid-cols-2 lg:gap-0">
        {/* Levá strana - Formulář */}
        <div className="lg:overflow-y-auto lg:h-screen p-6 lg:p-12">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-2xl font-medium tracking-wide uppercase">YEEZUZ2020</h1>
            </div>

            <form className="space-y-8">
              {/* Možnosti doručení */}
              <div>
                <h2 className="text-xs font-medium tracking-wide uppercase mb-6">Možnosti doručení</h2>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("home_delivery")}
                    className={`flex items-center justify-center gap-2 p-4 transition-all rounded-none border-2 ${deliveryMethod === "home_delivery"
                      ? "border-black bg-black text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                  >
                    <Package className="w-4 h-4" />
                    <span className="text-sm font-medium">Doručit domů</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("pickup")}
                    className={`flex items-center justify-center gap-2 p-4 border-2 transition-all rounded-none ${deliveryMethod === "pickup"
                      ? "border-black bg-black text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">Výdejní místo</span>
                  </button>
                </div>

                {deliveryMethod === "pickup" ? (
                  <div>
                    <div className="border-2 border-black p-6 mb-4">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-6 h-6 text-black" />
                        <div className="flex-1">
                          <h3 className="font-medium text-xs tracking-wide uppercase">Zásilkovna – výdejní místo</h3>
                          <p className="text-xs text-gray-600">Vyberte pobočku / Z-BOX</p>
                        </div>
                        <div className="text-right"><p className="font-medium text-xs">{deliveryPrice.toLocaleString("cs-CZ")} Kč</p></div>
                      </div>
                    </div>
                    <ZasilkovnaWidget
                      onPointSelect={(point) => {
                        setSelectedPickupPoint(point);
                        if (point) {
                          const branch: SelectedBranch = {
                            id: point.id,
                            name: point.name || '',
                            address: `${point.street || ''}, ${point.zip || ''} ${point.city || ''}`.trim()
                          };
                          savePacketaBranch(branch);
                        } else {
                          clearPacketaBranch();
                        }
                      }}
                      country="cz"
                      language="cs"
                    />
                    {selectedPickupPoint && (
                      <div className="mt-4 text-xs text-gray-700">
                        <p className="font-medium">{selectedPickupPoint.name}</p>
                        {selectedPickupPoint.street && <p>{selectedPickupPoint.street}</p>}
                        <p>{`${selectedPickupPoint.zip ?? ""} ${selectedPickupPoint.city ?? ""}`.trim()}</p>
                      </div>
                    )}
                    {/* Kontaktní údaje pro vyzvednutí */}
                    <div className="space-y-4 mt-6">
                      <input
                        type="email"
                        name="email"
                        placeholder="E-mail*"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 p-3 text-sm focus:border-black focus:outline-none rounded-none"
                        required
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" name="firstName" placeholder="Křestní jméno*" value={formData.firstName} onChange={handleInputChange} className="w-full border border-gray-300 p-3 text-sm focus:border-black focus:outline-none rounded-none" required />
                        <input type="text" name="lastName" placeholder="Příjmení*" value={formData.lastName} onChange={handleInputChange} className="w-full border border-gray-300 p-3 text-sm focus:border-black focus:outline-none rounded-none" required />
                      </div>
                      <input type="tel" name="phone" placeholder="Telefonní číslo*" value={formData.phone} onChange={handleInputChange} className="w-full border border-gray-300 p-3 text-sm focus:border-black focus:outline-none rounded-none" required />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="border-2 border-black p-6 mb-4">
                      <div className="flex items-center gap-3">
                        <Package className="w-6 h-6 text-black" />
                        <div className="flex-1">
                          <h3 className="font-medium text-xs tracking-wide uppercase">Zásilkovna – doručení domů</h3>
                          <p className="text-xs text-gray-600">Doručení přímo na Vaši adresu</p>
                        </div>
                        <div className="text-right"><p className="font-medium text-xs">{deliveryPrice.toLocaleString("cs-CZ")} Kč</p></div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <input
                        type="email"
                        name="email"
                        placeholder="E-mail*"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 p-3 text-sm focus:border-black focus:outline-none rounded-none"
                        required
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" name="firstName" placeholder="Křestní jméno*" value={formData.firstName} onChange={handleInputChange} className="w-full border border-gray-300 p-3 text-sm focus:border-black focus:outline-none rounded-none" required />
                        <input type="text" name="lastName" placeholder="Příjmení*" value={formData.lastName} onChange={handleInputChange} className="w-full border border-gray-300 p-3 text-sm focus:border-black focus:outline-none rounded-none" required />
                      </div>
                       <div className="relative">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                         <input
                           type="text"
                           name="address"
                           placeholder="Ulice a číslo popisné*"
                           value={formData.address}
                           onChange={handleInputChange}
                           onFocus={() => formData.address.length >= 3 && setShowSuggestions(true)}
                           onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                           className="w-full pl-10 pr-4 py-3 border border-gray-300 text-sm focus:border-black focus:outline-none rounded-none"
                           required
                         />
                         {isSearchingAddress && (
                           <div className="absolute right-3 top-1/2 -translate-y-1/2">
                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                           </div>
                         )}
                         {showSuggestions && addressSuggestions.length > 0 && (
                           <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 border-t-0 z-10 max-h-48 overflow-y-auto">
                             {addressSuggestions.map((suggestion, index) => (
                               <button
                                 key={index}
                                 type="button"
                                 onClick={() => selectAddress(suggestion)}
                                 className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                               >
                                 {suggestion}
                               </button>
                             ))}
                           </div>
                         )}
                         {deliveryMethod === 'home_delivery' && (
                           <p className="text-xs text-gray-500 mt-1">
                             Začněte psát ulici a město pro automatické dokončení adresy
                           </p>
                         )}
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                        <input type="text" name="city" placeholder="Město*" value={formData.city} onChange={handleInputChange} className="w-full border border-gray-300 p-3 text-sm focus:border-black focus:outline-none rounded-none" required />
                        <input
                          type="text"
                          name="postalCode"
                          placeholder="PSČ*"
                          value={formData.postalCode}
                          onChange={(e) => {
                            const formatted = formatPostalCode(e.target.value);
                            setFormData(prev => ({ ...prev, postalCode: formatted }));
                          }}
                          onBlur={(e) => {
                            if (e.target.value && !validatePostalCode(e.target.value)) {
                              // Could add error state here
                              console.warn('Invalid postal code format');
                            }
                          }}
                          className={`w-full border p-3 text-sm focus:outline-none rounded-none ${
                            formData.postalCode && !validatePostalCode(formData.postalCode)
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-gray-300 focus:border-black'
                          }`}
                          required
                        />
                      </div>
                      <input type="tel" name="phone" placeholder="Telefonní číslo*" value={formData.phone} onChange={handleInputChange} className="w-full border border-gray-300 p-3 text-sm focus:border-black focus:outline-none rounded-none" required />
                    </div>
                  </div>
                )}
              </div>

              {/* Platba */}
              <div className="pt-6">
                <h2 className="text-xs font-medium tracking-wide uppercase mb-6">Platba</h2>
                {(formData.email && formData.firstName && formData.lastName && formData.phone &&
                  ((deliveryMethod === "pickup") ||
                    (deliveryMethod === "home_delivery" && formData.address && formData.city && formData.postalCode))) ? (
                  <div>
                    <StripePaymentElement
                      billingData={{
                        email: formData.email,
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        name: `${formData.firstName} ${formData.lastName}`.trim(),
                        phone: formData.phone,
                        street: deliveryMethod === "home_delivery" ? formData.address : undefined,
                        city: deliveryMethod === "home_delivery" ? formData.city : undefined,
                        postalCode: deliveryMethod === "home_delivery" ? formData.postalCode : undefined,
                      }}
                      pickupPoint={deliveryMethod === "pickup" && selectedPickupPoint ? {
                        id: String(selectedPickupPoint.id),
                        name: selectedPickupPoint.name ?? "",
                        ...(selectedPickupPoint.street ? { street: selectedPickupPoint.street } : {}),
                        ...(selectedPickupPoint.zip ? { zip: selectedPickupPoint.zip } : {}),
                        ...(selectedPickupPoint.city ? { city: selectedPickupPoint.city } : {}),
                      } : null}
                      deliveryPriceCents={Math.round(deliveryPrice * 100)}
                    />
                  </div>
                ) : (
                  <div className="opacity-50 pointer-events-none">
                    <div className="bg-gray-100 p-6 text-center rounded-none">
                      <p className="text-xs text-gray-500">
                        {(!formData.email || !formData.firstName || !formData.lastName || !formData.phone)
                          ? "Pro platbu kartou vyplňte všechny povinné údaje"
                          : deliveryMethod === "pickup"
                            ? "Pro platbu kartou vyberte výdejní místo"
                            : "Vyplňte prosím adresu doručení"}
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-[9px] mt-4 leading-tight text-gray-600">Odesláním platby souhlasíte s našimi obchodními podmínkami a zásadami ochrany osobních údajů.</p>
              </div>
            </form>
          </div>
        </div>

        {/* Pravá strana - Košík (pouze desktop) */}
        {!isMobile && (
          <div className="bg-gray-50">
            <CartSummary
              cartItems={items}
              updateQuantity={handleQuantityChange}
              removeItem={handleRemoveItem}
              subtotal={subtotal}
              deliveryPrice={deliveryPrice}
              total={total}
              isMobile={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Hlavní komponenta
export default function UnifiedCheckout() {
  return <CheckoutForm />;
}