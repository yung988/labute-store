import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  console.log('🚀 Starting create-shipment for order:', req.url);

   // Temporary: Packeta API has outage (504 errors), disable until fixed
   // return NextResponse.json(
   //   { error: "Packeta API temporarily unavailable - try again later" },
   //   { status: 503 }
   // );

   // TODO: Uncomment and update to v5 when ready

  const { orderId } = await req.json();

  // Get order details
  console.log('📋 Getting order details for:', orderId);
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.error('❌ Order not found:', orderError);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  console.log('✅ Order found:', {
    id: order.id,
    amount_total: order.amount_total,
    packeta_point_id: order.packeta_point_id,
    items_length: order.items?.length || 0
  });

  if (!order.packeta_point_id) {
    return NextResponse.json({ error: "No Packeta point selected for this order" }, { status: 400 });
  }

  // Calculate total weight from order items (in kg for Packeta API)
  let totalWeightKg = 0.5; // Default 0.5kg fallback
  try {
    if (order.items && typeof order.items === 'string') {
      const items = JSON.parse(order.items) as Array<{
        description: string;
        quantity: number;
        amount_total: number;
      }>;

      console.log(`🔍 Processing ${items.length} items for weight calculation`);
      console.log(`📋 Raw items:`, JSON.stringify(items, null, 2));

      if (items.length > 0) {
        let calculatedWeightKg = 0;

        for (const item of items) {
          console.log(`📦 Processing item: "${item.description}", qty: ${item.quantity}, amount: ${item.amount_total}`);

          // Skip shipping items
          if (item.description?.toLowerCase().includes('shipping') ||
              item.description?.toLowerCase().includes('doprava') ||
              item.description?.toLowerCase().includes('zásilkovna')) {
            console.log(`⏭️ Skipping shipping item: ${item.description}`);
            continue;
          }

          // Find product by name (case-insensitive partial match)
          const { data: product, error: productError } = await supabaseAdmin
            .from('products')
            .select('name, weight_kg')
            .ilike('name', `%${item.description}%`)
            .single();

          if (productError) {
            console.warn(`⚠️ Product not found for: "${item.description}"`, productError);
            continue;
          }

          if (product?.weight_kg) {
            // Weight is already in kg, just multiply by quantity
            const itemWeightKg = product.weight_kg * item.quantity;
            calculatedWeightKg += itemWeightKg;
            console.log(`✅ Found product: "${product.name}", weight_kg: ${product.weight_kg}, quantity: ${item.quantity}, item weight: ${itemWeightKg}kg, running total: ${calculatedWeightKg}kg`);
          } else {
            console.warn(`⚠️ Product "${product?.name}" found but no weight_kg`);
          }
        }

        console.log(`📊 Total calculated weight before capping: ${calculatedWeightKg}kg`);

        if (calculatedWeightKg > 0) {
          // Cap weight at 30kg (Packeta limit) and ensure minimum 0.1kg
          totalWeightKg = Math.max(0.1, Math.min(30, calculatedWeightKg));
          console.log(`✂️ Weight after capping: ${totalWeightKg}kg`);
        } else {
          console.log(`⚠️ No valid products found, using default weight: ${totalWeightKg}kg`);
        }
      }
    } else {
      console.log(`⚠️ No items found in order, using default weight: ${totalWeightKg}kg`);
    }
  } catch (error) {
    console.warn('⚠️ Could not calculate weight from items, using default:', error);
    console.error('Error details:', error);
  }

   console.log(`📦 Final weight for order ${orderId}: ${totalWeightKg}kg`);

   // Convert amount from cents to CZK and cap values for Packeta limits
   const amountCZK = Math.floor((order.amount_total || 0) / 100); // Convert cents to CZK
   const maxAllowedValue = 50000; // Packeta limit for COD/value
   const safeAmount = Math.min(amountCZK, maxAllowedValue);

   console.log(`💰 Order amount: ${amountCZK} CZK, using safe amount: ${safeAmount} CZK`);

   // Create shipment via Packeta REST/XML API
   console.log(`📦 Creating Packeta shipment for order ${orderId}`);

   const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<createPacket>
  <apiPassword>${process.env.PACKETA_API_KEY}</apiPassword>
  <packetAttributes>
    <number>${orderId}</number>
    <name>${order.customer_name || ""}</name>
    <surname></surname>
    <email>${order.customer_email || ""}</email>
    <phone>${order.customer_phone || ""}</phone>
    <addressId>${order.packeta_point_id}</addressId>
    <cod>${safeAmount}</cod>
    <value>${safeAmount}</value>
    <weight>${totalWeightKg}</weight>
    <eshop>${process.env.PACKETA_ESHOP_ID || "labute-store"}</eshop>
  </packetAttributes>
</createPacket>`;

   const packetaResponse = await fetch(process.env.PACKETA_API_URL!, {
     method: "POST",
     headers: {
       "Content-Type": "application/xml",
       "Accept": "application/xml",
     },
     body: xmlBody
   });

   if (!packetaResponse.ok) {
     const errorText = await packetaResponse.text();
     console.error("❌ Packeta API error:", {
       status: packetaResponse.status,
       statusText: packetaResponse.statusText,
       error: errorText
     });
     return NextResponse.json(
       { error: `Packeta API error: ${packetaResponse.status} ${errorText}` },
       { status: 500 }
     );
   }

    const responseText = await packetaResponse.text();
    console.log("✅ Packeta API success:", responseText);

    // Extract packet ID from XML response
    const packetIdMatch = responseText.match(/<id>(\d+)<\/id>/);
    if (!packetIdMatch || !packetIdMatch[1]) {
      console.error("❌ No Packeta ID in response:", responseText);
      return NextResponse.json(
        { error: `Invalid Packeta response - missing ID: ${responseText}` },
        { status: 500 }
      );
    }

    const packetaId = packetIdMatch[1];

    // Extract barcode from XML response (sledovací kód začínající na Z)
    const barcodeMatch = responseText.match(/<barcode>([^<]+)<\/barcode>/);
    const packetaBarcode = barcodeMatch ? barcodeMatch[1] : null;

    // Generate tracking URL
    const trackingUrl = `https://www.zasilkovna.cz/sledovani/${packetaId}`;

    console.log(`📦 Created Packeta shipment with ID: ${packetaId}`);
    console.log(`📦 Packeta barcode: ${packetaBarcode}`);
    console.log(`🔗 Tracking URL: ${trackingUrl}`);

    // Update order with Packeta data
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        packeta_shipment_id: packetaId,
        packeta_barcode: packetaBarcode,
        packeta_tracking_url: trackingUrl,
        status: "processing",
      })
      .eq("id", orderId);

   if (updateError) {
     console.error("❌ Database update error:", updateError);
     return NextResponse.json({ error: updateError.message }, { status: 500 });
   }

   console.log(`✅ Order ${orderId} updated with Packeta ID ${packetaId}`);

    return NextResponse.json({
      success: true,
      packetaId: packetaId,
      packetaBarcode: packetaBarcode,
      trackingUrl: trackingUrl,
      message: `Shipment created successfully with Packeta ID: ${packetaId}${packetaBarcode ? ` (Barcode: ${packetaBarcode})` : ''}`
    });
}