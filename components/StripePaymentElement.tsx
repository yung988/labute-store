"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface BillingData {
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  street?: string;
  city?: string;
  postalCode?: string;
}

interface PickupPoint {
  id: string;
  name: string;
  street?: string;
  zip?: string;
  city?: string;
}

interface StripePaymentElementProps {
  billingData: BillingData;
  pickupPoint: PickupPoint | null;
  deliveryPriceCents: number;
}

export default function StripePaymentElement({
  billingData,
  pickupPoint,
  deliveryPriceCents,
}: StripePaymentElementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get cart items from localStorage (temporary solution)
      const storedCart = localStorage.getItem("cart");
      const cartItems = storedCart ? JSON.parse(storedCart) : [];

      if (cartItems.length === 0) {
        setError("Košík je prázdný");
        return;
      }

      const deliveryMethod = pickupPoint ? "pickup" : "home_delivery";

      const requestBody = {
        items: cartItems.map((item: any) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          size: item.size,
        })),
        deliveryMethod,
        selectedPickupPoint: pickupPoint,
        formData: {
          email: billingData.email,
          firstName: billingData.firstName,
          lastName: billingData.lastName,
          phone: billingData.phone,
          address: billingData.street,
          city: billingData.city,
          postalCode: billingData.postalCode,
        },
        deliveryPrice: deliveryPriceCents / 100, // Convert back to CZK
      };

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Chyba při vytváření platby");
      }

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      } else {
        throw new Error("Neplatná odpověď ze serveru");
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(err instanceof Error ? err.message : "Došlo k chybě při zpracování platby");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-none text-sm">
          {error}
        </div>
      )}

      <div className="bg-gray-50 p-6 text-center rounded-none">
        <div className="text-sm text-gray-600 mb-4">
          Kliknutím na tlačítko níže budete přesměrováni na zabezpečenou platební stránku Stripe.
        </div>

        <Button
          onClick={handlePayment}
          disabled={isLoading}
          className="w-full bg-black text-white py-3 text-sm tracking-wide uppercase rounded-none disabled:opacity-50"
        >
          {isLoading ? "Vytváření platby..." : "Zaplatit kartou"}
        </Button>
      </div>

      <div className="text-xs text-gray-600 leading-tight">
        Platba probíhá přes Stripe, který zajišťuje bezpečné zpracování plateb.
        Vaše platební údaje nejsou uloženy na našem serveru.
      </div>
    </div>
  );
}
