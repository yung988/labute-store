"use client";

import { ChevronDown, ChevronUp, Minus, Package, Plus, X, MapPin } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ZasilkovnaWidget from "@/components/checkout/ZasilkovnaWidget";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import AddressAutocomplete from "@/components/AddressAutocomplete";

export interface PacketaPoint {
  id: string;
  name?: string;
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
}

type ZasilkovnaPoint = PacketaPoint;



interface CartSummaryProps {
  isMobile?: boolean;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

// Komponenta košíku
const CartSummary = ({
  isMobile = false,
  isCollapsed = false,
  toggleCollapse,
}: CartSummaryProps) => {
  const { items, totalItems, totalPrice, updateQuantity, removeItem } = useCart();

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
              Zobrazit košík ({totalItems})
            </p>
            <p className="text-xs text-gray-600 mt-1">{formatCurrency(totalPrice)}</p>
          </div>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`bg-white ${isMobile ? "border-b border-gray-300" : "border border-gray-300 rounded-none"} ${!isMobile ? "sticky top-0 h-screen overflow-y-auto" : ""}`}
    >
      {isMobile && (
        <div className="sticky top-0 bg-white border-b border-gray-300 p-4">
          <button
            type="button"
            onClick={toggleCollapse}
            className="w-full flex items-center justify-between text-left"
          >
            <p className="text-xs font-medium tracking-wide uppercase">Košík ({totalItems})</p>
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="p-6">
        {!isMobile && (
          <h2 className="text-xs font-medium tracking-wide uppercase mb-6">Košík ({totalItems})</h2>
        )}

        {/* Položky košíku */}
        <div className="space-y-4 mb-6">
          {items.map((item, index) => (
            <div
              key={`${item.id}-${item.size || "no-size"}-${index}`}
              className="flex items-start gap-4 pb-4 border-b border-gray-200"
            >
              <div className="relative w-16 h-16 bg-gray-100 flex-shrink-0 border border-black">
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
                <p className="text-xs font-medium mt-1">{formatCurrency(item.price)}</p>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-6 h-6 flex items-center justify-center border border-gray-300 hover:bg-gray-50 rounded-none"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-xs font-medium">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-6 h-6 flex items-center justify-center border border-gray-300 hover:bg-gray-50 rounded-none"
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
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-xs">Váš košík je prázdný</p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="mt-4 rounded-none"
              variant="outline"
            >
              Pokračovat v nákupu
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Komponenta cart formuláře
function CartForm() {
  const { items, totalPrice, isInitialized } = useCart();
  const router = useRouter();
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<ZasilkovnaPoint | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [isCartCollapsed, setIsCartCollapsed] = useState(true);
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "home_delivery">("pickup");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
  });

  // Načti form data z localStorage při načtení
  useEffect(() => {
    const savedFormData = localStorage.getItem('checkout-form-data');
    if (savedFormData) {
      try {
        setFormData(JSON.parse(savedFormData));
      } catch (error) {
        console.error('Chyba při načítání form dat:', error);
      }
    }
  }, []);

  // Načti delivery method a pickup point z localStorage
  useEffect(() => {
    const savedDeliveryMethod = localStorage.getItem('checkout-delivery-method');
    if (savedDeliveryMethod) {
      setDeliveryMethod(savedDeliveryMethod as "pickup" | "home_delivery");
    }

    const savedPickupPoint = localStorage.getItem('checkout-pickup-point');
    if (savedPickupPoint) {
      try {
        const point = JSON.parse(savedPickupPoint);
        setSelectedPickupPoint(point);
        if (point) {
          // Note: selectedBranch was removed as unused variable
        }
      } catch (error) {
        console.error('Chyba při načítání pickup point:', error);
      }
    }
  }, []);

  // Detekce mobilního zařízení
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Pokud je košík prázdný, přesměruj zpět na obchod (ale počkej až se načte z localStorage)
  useEffect(() => {
    if (isInitialized && items.length === 0) {
      router.push("/");
    }
  }, [isInitialized, items.length, router]);

  const deliveryPrice = deliveryMethod === "pickup" ? 79 : 149; // v korunách
  const total = totalPrice + deliveryPrice;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    
    // Ulož do localStorage
    localStorage.setItem('checkout-form-data', JSON.stringify(newFormData));
  };

  const handleCheckout = async () => {
    if (checkoutLoading) return;
    
    setCheckoutLoading(true);
    setCheckoutError(null);
    
    try {
      console.log('Creating checkout session...');
      
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          deliveryMethod,
          selectedPickupPoint,
          formData,
          deliveryPrice,
        }),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('API error:', responseData);
        setCheckoutError(responseData.error || 'Chyba při vytváření platby');
        setCheckoutLoading(false);
        return;
      }

      console.log('Checkout session created, redirecting...');
      // Redirect na Stripe checkout
      window.location.href = responseData.url;
    } catch (error) {
      console.error('Checkout error:', error);
      setCheckoutError('Chyba připojení. Zkuste to znovu.');
      setCheckoutLoading(false);
    }
  };

  const isFormValid = formData.email && formData.firstName && formData.lastName && formData.phone &&
    ((deliveryMethod === "pickup" && selectedPickupPoint) ||
     (deliveryMethod === "home_delivery" && formData.address && formData.city && formData.postalCode));

  // Zobraz loading dokud se nenačte cart z localStorage
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
          <p className="text-xs text-gray-600 mt-2">Načítám košík...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null; // Prevent flash before redirect
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Cart Summary */}
      {isMobile && (
        <CartSummary
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
                    onClick={() => {
                      setDeliveryMethod("home_delivery");
                      localStorage.setItem('checkout-delivery-method', 'home_delivery');
                    }}
                    className={`flex items-center justify-center gap-2 p-4 transition-all rounded-none border-2 ${
                      deliveryMethod === "home_delivery"
                        ? "border-black bg-black text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span className="text-sm font-medium">Doručit domů</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMethod("pickup");
                      localStorage.setItem('checkout-delivery-method', 'pickup');
                    }}
                    className={`flex items-center justify-center gap-2 p-4 border-2 transition-all rounded-none ${
                      deliveryMethod === "pickup"
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
                        <div className="text-right">
                          <p className="font-medium text-xs">{formatCurrency(deliveryPrice)}</p>
                        </div>
                      </div>
                    </div>
                    <ZasilkovnaWidget
                      onPointSelect={(point) => {
                        setSelectedPickupPoint(point);
                        if (point) {
                          localStorage.setItem('checkout-pickup-point', JSON.stringify(point));
                        } else {
                          localStorage.removeItem('checkout-pickup-point');
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
                        <input 
                          type="text" 
                          name="firstName" 
                          placeholder="Křestní jméno*" 
                          value={formData.firstName} 
                          onChange={handleInputChange} 
                          className="w-full border border-gray-300 p-3 text-sm focus:border-black focus:outline-none rounded-none" 
                          required 
                        />
                        <input 
                          type="text" 
                          name="lastName" 
                          placeholder="Příjmení*" 
                          value={formData.lastName} 
                          onChange={handleInputChange} 
                          className="w-full border border-gray-300 p-3 text-sm focus:border-black focus:outline-none rounded-none" 
                          required 
                        />
                      </div>
                      <input 
                        type="tel" 
                        name="phone" 
                        placeholder="Telefonní číslo*" 
                        value={formData.phone} 
                        onChange={handleInputChange} 
                        className="w-full border border-gray-300 p-3 text-sm focus:border-black focus:outline-none rounded-none" 
                        required 
                      />
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
                        <div className="text-right">
                          <p className="font-medium text-xs">{formatCurrency(deliveryPrice)}</p>
                        </div>
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
                        <input 
                          type="text" 
                          name="firstName" 
                          placeholder="Křestní jméno*" 
                          value={formData.firstName} 
                          onChange={handleInputChange} 
                          className="w-full border border-gray-300 p-3 text-sm focus:border-black focus:outline-none rounded-none" 
                          required 
                        />
                        <input 
                          type="text" 
                          name="lastName" 
                          placeholder="Příjmení*" 
                          value={formData.lastName} 
                          onChange={handleInputChange} 
                          className="w-full border border-gray-300 p-3 text-sm focus:border-black focus:outline-none rounded-none" 
                          required 
                        />
                      </div>
                      <AddressAutocomplete
                        value={formData.address}
                        onChange={(value) => setFormData(prev => ({ ...prev, address: value }))}
                        onAddressSelect={(address) => {
                          setFormData(prev => ({
                            ...prev,
                            address: address.street || address.fullAddress,
                            city: address.city || prev.city,
                            postalCode: address.postalCode || prev.postalCode
                          }));
                        }}
                        placeholder="Ulice a číslo popisné*"
                        className="required"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <input 
                          type="text" 
                          name="city" 
                          placeholder="Město*" 
                          value={formData.city} 
                          onChange={handleInputChange} 
                          className="w-full border border-gray-300 p-3 text-sm focus:border-black focus:outline-none rounded-none" 
                          required 
                        />
                        <input 
                          type="text" 
                          name="postalCode" 
                          placeholder="PSČ*" 
                          value={formData.postalCode} 
                          onChange={handleInputChange} 
                          className="w-full border border-gray-300 p-3 text-sm focus:border-black focus:outline-none rounded-none" 
                          required 
                        />
                      </div>
                      <input 
                        type="tel" 
                        name="phone" 
                        placeholder="Telefonní číslo*" 
                        value={formData.phone} 
                        onChange={handleInputChange} 
                        className="w-full border border-gray-300 p-3 text-sm focus:border-black focus:outline-none rounded-none" 
                        required 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Pokračovat k platbě */}
              <div className="pt-6 border-t border-gray-300">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="uppercase tracking-wide">Mezisoučet</span>
                    <span>{formatCurrency(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="uppercase tracking-wide">Doprava</span>
                    <span>{formatCurrency(deliveryPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-medium border-t pt-4">
                    <span className="uppercase tracking-wide">Celkem</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  
                  {checkoutError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                      {checkoutError}
                    </div>
                  )}
                  
                  <Button
                    onClick={handleCheckout}
                    disabled={!isFormValid || checkoutLoading}
                    className="w-full bg-black hover:bg-gray-800 text-white py-4 text-sm font-medium tracking-wide uppercase rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkoutLoading ? 'Vytváří se platba...' : 'Pokračovat k platbě'}
                  </Button>
                  
                  <p className="text-[9px] text-center leading-tight text-gray-600">
                    Kliknutím souhlasíte s našimi obchodními podmínkami a zásadami ochrany osobních údajů.
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Pravá strana - Košík (pouze desktop) */}
        {!isMobile && (
          <div className="bg-gray-50">
            <CartSummary isMobile={false} />
          </div>
        )}
      </div>
    </div>
  );
}

// Hlavní komponenta
export default function CartPage() {
  return <CartForm />;
}