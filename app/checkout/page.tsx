"use client";

import { ChevronDown, ChevronUp, Minus, Package, Plus, X, MapPin } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ZasilkovnaWidget from "@/components/checkout/ZasilkovnaWidget";
import { useSpreeCart } from "@/context/CartContext";
import StripePaymentElement from "@/components/StripePaymentElement";
import AddressAutocomplete from "@/components/AddressAutocomplete";

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
  const [isChangingDelivery, setIsChangingDelivery] = useState(false);
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


  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    firstName?: string;
    lastName?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    phone?: string;
  }>({});

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

  const handleDeliveryMethodChange = async (method: "pickup" | "home_delivery") => {
    setIsChangingDelivery(true);
    try {
      setDeliveryMethod(method);
      
      // Clear form data when switching methods
      if (method === "pickup") {
        setFormData(prev => ({
          ...prev,
          address: "",
          city: "",
          postalCode: ""
        }));
        setValidationErrors(prev => ({
          ...prev,
          address: undefined,
          city: undefined,
          postalCode: undefined
        }));
      } else {
        setSelectedPickupPoint(null);
        await clearPacketaBranch();
      }
    } finally {
      setIsChangingDelivery(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear validation error when user starts typing
    if (validationErrors[name as keyof typeof validationErrors]) {
      setValidationErrors(prev => ({ ...prev, [name]: undefined }));
    }

    // Real-time validation for specific fields
    if (name === 'phone' && value && !validatePhone(value)) {
      setValidationErrors(prev => ({ ...prev, phone: 'Neplatné telefonní číslo' }));
    }
  };

  const handleAddressSelect = (address: {
    street?: string;
    city?: string;
    postalCode?: string;
    fullAddress?: string;
  }) => {
    setFormData(prev => ({
      ...prev,
      address: address.street || address.fullAddress || '',
      city: address.city || '',
      postalCode: address.postalCode || ''
    }));

    // Clear validation errors when address is selected from autocomplete
    setValidationErrors(prev => ({
      ...prev,
      address: undefined,
      city: undefined,
      postalCode: undefined
    }));
  };

  const validatePostalCode = (postalCode: string) => {
    // Czech postal code format: 123 45 or 12345
    const cleanCode = postalCode.replace(/\s/g, '');
    return /^\d{5}$/.test(cleanCode);
  };

  // Validation functions for future use
  // const validateAddress = (address: string) => {
  //   const trimmed = address.trim();
  //   if (trimmed.length < 5) return false;
  //   const hasNumber = /\d/.test(trimmed);
  //   const hasLetter = /[a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/.test(trimmed);
  //   return hasNumber && hasLetter;
  // };

  // const validateCity = (city: string) => {
  //   const trimmed = city.trim();
  //   return trimmed.length >= 2 && /^[a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\s\-]+$/.test(trimmed);
  // };

  const validatePhone = (phone: string) => {
    // Czech phone number validation - should be 9 digits (without +420)
    const cleanPhone = phone.replace(/[\s\-\+]/g, '');
    // Accept both formats: 420123456789 or 123456789
    return /^(420)?[1-9]\d{8}$/.test(cleanPhone);
  };

  // Validation function for future use
  // const validateForm = () => {
  //   const errors: typeof validationErrors = {};
  //   // ... validation logic
  //   setValidationErrors(errors);
  //   return Object.keys(errors).length === 0;
  // };

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
                    onClick={() => handleDeliveryMethodChange("home_delivery")}
                    disabled={isChangingDelivery}
                    className={`flex items-center justify-center gap-2 p-4 transition-all rounded-none border-2 ${
                      deliveryMethod === "home_delivery"
                        ? "border-black bg-black text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    } ${isChangingDelivery ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Package className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {isChangingDelivery && deliveryMethod !== "home_delivery" ? "Načítám..." : "Doručit domů"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeliveryMethodChange("pickup")}
                    disabled={isChangingDelivery}
                    className={`flex items-center justify-center gap-2 p-4 border-2 transition-all rounded-none ${
                      deliveryMethod === "pickup"
                        ? "border-black bg-black text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    } ${isChangingDelivery ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {isChangingDelivery && deliveryMethod !== "pickup" ? "Načítám..." : "Výdejní místo"}
                    </span>
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
                       <div>
                         <input
                           type="email"
                           name="email"
                           placeholder="E-mail*"
                           value={formData.email}
                           onChange={handleInputChange}
                           className={`w-full border p-3 text-sm focus:outline-none rounded-none ${
                             validationErrors.email 
                               ? 'border-red-300 focus:border-red-500' 
                               : 'border-gray-300 focus:border-black'
                           }`}
                           required
                         />
                         {validationErrors.email && (
                           <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                         )}
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <input 
                             type="text" 
                             name="firstName" 
                             placeholder="Křestní jméno*" 
                             value={formData.firstName} 
                             onChange={handleInputChange} 
                             className={`w-full border p-3 text-sm focus:outline-none rounded-none ${
                               validationErrors.firstName 
                                 ? 'border-red-300 focus:border-red-500' 
                                 : 'border-gray-300 focus:border-black'
                             }`}
                             required 
                           />
                           {validationErrors.firstName && (
                             <p className="text-red-500 text-xs mt-1">{validationErrors.firstName}</p>
                           )}
                         </div>
                         <div>
                           <input 
                             type="text" 
                             name="lastName" 
                             placeholder="Příjmení*" 
                             value={formData.lastName} 
                             onChange={handleInputChange} 
                             className={`w-full border p-3 text-sm focus:outline-none rounded-none ${
                               validationErrors.lastName 
                                 ? 'border-red-300 focus:border-red-500' 
                                 : 'border-gray-300 focus:border-black'
                             }`}
                             required 
                           />
                           {validationErrors.lastName && (
                             <p className="text-red-500 text-xs mt-1">{validationErrors.lastName}</p>
                           )}
                         </div>
                        </div>
                       <div>
                         <input 
                           type="tel" 
                           name="phone" 
                           placeholder="Telefonní číslo*" 
                           value={formData.phone} 
                           onChange={handleInputChange} 
                           className={`w-full border p-3 text-sm focus:outline-none rounded-none ${
                             validationErrors.phone 
                               ? 'border-red-300 focus:border-red-500' 
                               : 'border-gray-300 focus:border-black'
                           }`}
                           required 
                         />
                         {validationErrors.phone && (
                           <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>
                         )}
                       </div>
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
                       <div>
                         <input
                           type="email"
                           name="email"
                           placeholder="E-mail*"
                           value={formData.email}
                           onChange={handleInputChange}
                           className={`w-full border p-3 text-sm focus:outline-none rounded-none ${
                             validationErrors.email 
                               ? 'border-red-300 focus:border-red-500' 
                               : 'border-gray-300 focus:border-black'
                           }`}
                           required
                         />
                         {validationErrors.email && (
                           <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                         )}
                       </div>

                        <div className="relative">
                          <AddressAutocomplete
                            value={formData.address}
                            onChange={(value) => setFormData(prev => ({ ...prev, address: value }))}
                            onAddressSelect={handleAddressSelect}
                            placeholder="Ulice a číslo popisné*"
                            className={`w-full ${
                              validationErrors.address 
                                ? 'border-red-300 focus:border-red-500' 
                                : 'border-gray-300 focus:border-black'
                            }`}
                          />
                          {validationErrors.address ? (
                            <p className="text-red-500 text-xs mt-1">{validationErrors.address}</p>
                          ) : deliveryMethod === 'home_delivery' && (
                            <p className="text-xs text-gray-500 mt-1">
                              Začněte psát ulici a město pro automatické dokončení adresy
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                         <div>
                           <input 
                             type="text" 
                             name="city" 
                             placeholder="Město*" 
                             value={formData.city} 
                             onChange={handleInputChange} 
                             className={`w-full border p-3 text-sm focus:outline-none rounded-none ${
                               validationErrors.city 
                                 ? 'border-red-300 focus:border-red-500' 
                                 : 'border-gray-300 focus:border-black'
                             }`}
                             required 
                           />
                           {validationErrors.city && (
                             <p className="text-red-500 text-xs mt-1">{validationErrors.city}</p>
                           )}
                         </div>
                         <div>
                           <input
                             type="text"
                             name="postalCode"
                             placeholder="PSČ*"
                             value={formData.postalCode}
                             onChange={(e) => {
                               const formatted = formatPostalCode(e.target.value);
                               setFormData(prev => ({ ...prev, postalCode: formatted }));
                               // Clear validation error when user types
                               if (validationErrors.postalCode) {
                                 setValidationErrors(prev => ({ ...prev, postalCode: undefined }));
                               }
                             }}
                             onBlur={(e) => {
                               if (e.target.value && !validatePostalCode(e.target.value)) {
                                 setValidationErrors(prev => ({ ...prev, postalCode: 'Neplatné PSČ (formát: 123 45)' }));
                               }
                             }}
                             className={`w-full border p-3 text-sm focus:outline-none rounded-none ${
                               validationErrors.postalCode
                                 ? 'border-red-300 focus:border-red-500'
                                 : 'border-gray-300 focus:border-black'
                             }`}
                             required
                           />
                           {validationErrors.postalCode && (
                             <p className="text-red-500 text-xs mt-1">{validationErrors.postalCode}</p>
                           )}
                         </div>
                       </div>
                       <div>
                         <input 
                           type="tel" 
                           name="phone" 
                           placeholder="Telefonní číslo*" 
                           value={formData.phone} 
                           onChange={handleInputChange} 
                           className={`w-full border p-3 text-sm focus:outline-none rounded-none ${
                             validationErrors.phone 
                               ? 'border-red-300 focus:border-red-500' 
                               : 'border-gray-300 focus:border-black'
                           }`}
                           required 
                         />
                         {validationErrors.phone && (
                           <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>
                         )}
                       </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Platba */}
              <div className="pt-6">
                <h2 className="text-xs font-medium tracking-wide uppercase mb-6">Platba</h2>
                 {(formData.email && formData.firstName && formData.lastName && formData.phone &&
                   ((deliveryMethod === "pickup" && selectedPickupPoint) ||
                     (deliveryMethod === "home_delivery" && formData.address && formData.city && formData.postalCode)) &&
                   Object.keys(validationErrors).length === 0) ? (
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
                         {Object.keys(validationErrors).length > 0
                           ? "Opravte chyby ve formuláři"
                           : (!formData.email || !formData.firstName || !formData.lastName || !formData.phone)
                             ? "Pro platbu kartou vyplňte všechny povinné údaje"
                             : deliveryMethod === "pickup" && !selectedPickupPoint
                               ? "Pro platbu kartou vyberte výdejní místo"
                               : deliveryMethod === "home_delivery" && (!formData.address || !formData.city || !formData.postalCode)
                                 ? "Vyplňte prosím adresu doručení"
                                 : "Formulář je připraven k odeslání"}
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