import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  console.log('🚀 Starting create-shipment for order:', req.url);

  // Debug environment variables
  console.log('🔧 Environment variables:', {
    PACKETA_API_KEY: process.env.PACKETA_API_KEY ? '✅ Set' : '❌ Missing',
    PACKETA_API_URL: process.env.PACKETA_API_URL || '❌ Missing',
    PACKETA_ESHOP_ID: process.env.PACKETA_ESHOP_ID || '❌ Missing',
    PACKETA_SENDER_ID: process.env.PACKETA_SENDER_ID || '❌ Missing'
  });

  // Debug actual values
  console.log('🔧 Actual values:', {
    PACKETA_API_KEY: process.env.PACKETA_API_KEY,
    PACKETA_API_URL: process.env.PACKETA_API_URL,
    PACKETA_ESHOP_ID: process.env.PACKETA_ESHOP_ID,
    PACKETA_SENDER_ID: process.env.PACKETA_SENDER_ID
  });

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

    // Format phone number for Packeta API (must have +420 prefix)
   let formattedPhone = order.customer_phone || "";
   if (formattedPhone && !formattedPhone.startsWith('+')) {
     // If phone doesn't start with +, assume it's Czech number and add +420
     formattedPhone = `+420${formattedPhone}`;
   }
   console.log(`📞 Original phone: ${order.customer_phone}, Formatted: ${formattedPhone}`);

    // Create shipment via Packeta REST/XML API
    console.log(`📦 Creating Packeta shipment for order ${orderId}`);

    // Use shorter ID for Packeta (last 8 characters of UUID)
    const packetaOrderId = orderId.slice(-8);
    console.log(`📝 Using Packeta order ID: ${packetaOrderId} (from ${orderId})`);

    // Use Packeta v5 API like other endpoints (JSON format)
    const PACKETA_API_KEY = process.env.PACKETA_API_KEY;

    console.log(`🔑 API Key status: ${PACKETA_API_KEY ? 'Set' : 'NOT SET - THIS IS THE PROBLEM!'}`);

    if (!PACKETA_API_KEY) {
      console.error('❌ PACKETA_API_KEY is not set on Vercel!');
      return NextResponse.json(
        { error: 'Packeta API key is not configured on Vercel. Please set PACKETA_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const requestBody = {
      packetIds: [], // Will be filled by API
      senderId: process.env.PACKETA_SENDER_ID || "your-sender-id",
      recipient: {
        name: order.customer_name || "",
        email: order.customer_email || "",
        phone: formattedPhone,
      },
      deliveryPointId: order.packeta_point_id,
      cod: safeAmount,
      value: safeAmount,
      weight: totalWeightKg,
      eshop: process.env.PACKETA_ESHOP_ID || "labute-store",
      externalReference: packetaOrderId,
    };

    console.log('📄 JSON Request Body:', JSON.stringify(requestBody, null, 2));

    const packetaResponse = await fetch("https://api.packeta.com/api/v5/shipments", {
      method: "POST",
      headers: {
        "Authorization": `ApiKey ${PACKETA_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody)
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

    const packetaResult = await packetaResponse.json();
    console.log("✅ Packeta API success:", packetaResult);

    // Extract packet ID from JSON response
    const packetaId = packetaResult?.packetIds?.[0] || packetaResult?.id;
    if (!packetaId) {
      console.error("❌ No Packeta ID in response:", packetaResult);
      return NextResponse.json(
        { error: `Invalid Packeta response - missing ID: ${JSON.stringify(packetaResult)}` },
        { status: 500 }
      );
    }

    // Extract barcode from JSON response (sledovací kód začínající na Z)
    const packetaBarcode = packetaResult?.barcode || packetaResult?.barcodeText;

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