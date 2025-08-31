// lib/shipping/packeta.ts
// Server-side shipping calculator for Packeta (CZ) based on provided pricelist.
// - Delivery methods supported: pickup points (Z-Point/Z-Box) and home delivery
// - Bands (CZK, without VAT):
//   Pickup (PP/Z-Box):
//     0–5 kg = 62; 5–10 kg = 120; 10–15 kg = 120 (max 15 kg)
//   Home Delivery (HD):
//     0–1 kg = 89; 1–2 kg = 89; 2–5 kg = 89; 5–10 kg = 130; 10–15 kg = 130; 15–30 kg = 250
// - Surcharges applied:
//     Fuel surcharge: +5% (of base)
//     Toll surcharge: +2.10 CZK (<=5 kg) else +4.80 CZK (for higher bands)
//     Extra safety margin: +10 CZK (requested)
// - Result is rounded up to integer CZK (Math.ceil)
// - All calculations are conservative to avoid undercharging.

import { supabaseAdmin } from "@/lib/supabase/admin";

export type DeliveryMethod = "pickup" | "home_delivery";

export interface QuoteItem {
  productId: string;
  quantity: number;
}

export interface ShippingQuote {
  baseCZK: number;
  fuelCZK: number;
  tollCZK: number;
  extraCZK: number; // always +10 CZK
  totalCZK: number; // ceil(base + fuel + toll + extra)
}

// Compute base price (CZK) by delivery method and total weight (kg)
export function basePriceCZK(weightKg: number, method: DeliveryMethod): number {
  const w = Math.max(0, weightKg);
  if (method === "pickup") {
    // PP / Z-Box bands (max 15 kg)
    if (w <= 5) return 62;
    if (w <= 10) return 120;
    if (w <= 15) return 120;
    // Over the documented max weight for pickup
    // Be conservative: use the highest known band to avoid undercharge
    return 120;
  } else {
    // Home Delivery bands
    if (w <= 1) return 89;
    if (w <= 2) return 89;
    if (w <= 5) return 89;
    if (w <= 10) return 130;
    if (w <= 15) return 130;
    if (w <= 30) return 250;
    // Over 30 kg: use highest band as safe fallback
    return 250;
  }
}

// Toll surcharge depending on weight band
export function tollSurchargeCZK(weightKg: number): number {
  return weightKg <= 5 ? 2.10 : 4.80;
}

// Compose full quote (CZK) from weight and method
export function computeQuoteFromWeight(weightKg: number, method: DeliveryMethod): ShippingQuote {
  const base = basePriceCZK(weightKg, method);
  const fuel = Math.ceil(base * 0.05); // 5% fuel, rounded up to CZK to be safe
  const toll = tollSurchargeCZK(weightKg);
  const extra = 10; // +10 CZK safety margin as requested
  const total = Math.ceil(base + fuel + toll + extra);
  return { baseCZK: base, fuelCZK: fuel, tollCZK: toll, extraCZK: extra, totalCZK: total };
}

// Fetch total weight (kg) from items by looking up products.weight_kg in DB.
// If a product has no weight, default to 0.5 kg per unit (conservative).
export async function computeTotalWeightFromItems(items: QuoteItem[]): Promise<number> {
  if (!items || items.length === 0) return 0;
  const ids = Array.from(new Set(items.map(i => i.productId))).filter(Boolean);
  if (ids.length === 0) {
    // No productIds provided, assume conservative 0.5 kg per item
    return items.reduce((sum, it) => sum + (it.quantity || 0) * 0.5, 0);
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, weight_kg")
    .in("id", ids);

  if (error) {
    // On error, assume conservative 0.5 kg per item
    return items.reduce((sum, it) => sum + (it.quantity || 0) * 0.5, 0);
  }

  const weightById = new Map<string, number>();
  for (const row of data || []) {
    const w = typeof row.weight_kg === "number" ? row.weight_kg : undefined;
    if (row.id && typeof w === "number" && isFinite(w) && w >= 0) {
      weightById.set(row.id, w);
    }
  }

  let total = 0;
  for (const it of items) {
    const perUnit = weightById.get(it.productId) ?? 0.5; // fallback 0.5 kg
    total += perUnit * Math.max(0, it.quantity || 0);
  }
  return total;
}

export async function computeQuoteFromItems(items: QuoteItem[], method: DeliveryMethod): Promise<ShippingQuote> {
  const weight = await computeTotalWeightFromItems(items);
  return computeQuoteFromWeight(weight, method);
}

