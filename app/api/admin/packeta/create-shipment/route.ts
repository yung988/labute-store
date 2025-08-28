import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  console.log('🚀 Starting create-shipment for order:', req.url);

  // Check if Packeta API is temporarily disabled
  if (process.env.PACKETA_API_DISABLED === 'true') {
    console.log('🚫 Packeta API is temporarily disabled via PACKETA_API_DISABLED=true');
    return NextResponse.json(
      {
        error: "Packeta API is temporarily disabled due to service issues. Please try again later or contact support.",
        disabled: true
      },
      { status: 503 }
    );
  }

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

  // Check required environment variables
  const PACKETA_API_KEY = process.env.PACKETA_API_KEY;
  const senderId = process.env.PACKETA_SENDER_ID;
  const eshopId = process.env.PACKETA_ESHOP_ID;

  if (!PACKETA_API_KEY) {
    console.error('❌ PACKETA_API_KEY is not set on Vercel!');
    return NextResponse.json(
      { error: 'Packeta API key is not configured on Vercel. Please set PACKETA_API_KEY environment variable.' },
      { status: 500 }
    );
  }

  if (!senderId) {
    console.error('❌ PACKETA_SENDER_ID is not set on Vercel!');
    return NextResponse.json(
      { error: 'Packeta sender ID is not configured on Vercel. Please set PACKETA_SENDER_ID environment variable.' },
      { status: 500 }
    );
  }

  if (!eshopId) {
    console.error('❌ PACKETA_ESHOP_ID is not set on Vercel!');
    return NextResponse.json(
      { error: 'Packeta eshop ID is not configured on Vercel. Please set PACKETA_ESHOP_ID environment variable.' },
      { status: 500 }
    );
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

  // Use shorter ID for Packeta (last 8 characters of UUID)
  const packetaOrderId = orderId.slice(-8);
  console.log(`📝 Using Packeta order ID: ${packetaOrderId} (from ${orderId})`);

  // Split customer name into first name and last name
  const customerName = order.customer_name || "";
  const nameParts = customerName.trim().split(' ');
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(' ') || firstName; // If no lastname, use firstname

  // Convert weight from kg to grams (Packeta v5 expects grams)
  const weightInGrams = Math.round(totalWeightKg * 1000);

  const requestBody = {
    number: packetaOrderId,
    name: firstName,
    surname: lastName,
    email: order.customer_email || "",
    phone: formattedPhone,
    currency: "CZK",
    cod: safeAmount,
    value: safeAmount,
    weight: weightInGrams,
    eshop: eshopId,
    delivery_point: parseInt(order.packeta_point_id),
    order_number: packetaOrderId,
    note: `Order ${orderId.slice(-8)}`
  };

  console.log('📄 JSON Request Body:', JSON.stringify(requestBody, null, 2));
  console.log('🔧 Environment variables used:');
  console.log('   PACKETA_SENDER_ID:', senderId);
  console.log('   PACKETA_ESHOP_ID:', eshopId);
  console.log('   PACKETA_API_KEY length:', PACKETA_API_KEY?.length || 0);

  // Build XML request for Packeta REST API
  function xmlEscape(v: string) {
    return v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  }



   const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
 <createPacket>
   <apiPassword>${xmlEscape(PACKETA_API_KEY)}</apiPassword>
   <packetAttributes>
     <number>${xmlEscape(packetaOrderId)}</number>
     <name>${xmlEscape(firstName)}</name>
     <surname>${xmlEscape(lastName)}</surname>
     <email>${xmlEscape(order.customer_email || '')}</email>
     <phone>${xmlEscape(formattedPhone)}</phone>
     <addressId>${xmlEscape(order.packeta_point_id)}</addressId>
     <cod>${xmlEscape(String(safeAmount))}</cod>
     <value>${xmlEscape(String(safeAmount))}</value>
     <weight>${xmlEscape(String(weightInGrams))}</weight>
     <eshop>${xmlEscape(eshopId)}</eshop>
   </packetAttributes>
 </createPacket>`;

   console.log('📄 XML Request Body:', xmlBody);

   const xmlApiUrl = process.env.PACKETA_API_URL || 'https://www.zasilkovna.cz/api/rest';

   // Simple timeout and retry for Packeta XML API
   const MAX_RETRIES = 3;
   const TIMEOUT_MS = 30000; // 30 second timeout

   let packetaResponse: Response | undefined;

   for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
     try {
       console.log(`🔄 Packeta XML API attempt ${attempt}/${MAX_RETRIES}`);

       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

       packetaResponse = await fetch(`${xmlApiUrl}/createPacket`, {
         method: "POST",
         headers: {
           "Content-Type": "application/xml",
           "Accept": "application/xml",
         },
         body: xmlBody,
         signal: controller.signal
       });

      clearTimeout(timeoutId);

      // If successful (2xx status) or client error (4xx), don't retry
      if (packetaResponse.ok || (packetaResponse.status >= 400 && packetaResponse.status < 500)) {
        break;
      }

      // For server errors (5xx) or timeout, retry
      if (attempt < MAX_RETRIES) {
        console.log(`⏳ Packeta API returned ${packetaResponse.status}, retrying in ${Math.pow(2, attempt)}s...`);
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }

    } catch (error) {
      const err = error as Error;
      console.log(`❌ Packeta API attempt ${attempt} failed:`, err.message);

      if (attempt === MAX_RETRIES) {
        throw new Error(`Packeta API failed after ${MAX_RETRIES} attempts: ${err.message}`);
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  // Check if we got any response
  if (!packetaResponse) {
    throw new Error('Packeta API failed: no response received');
  }

  // Handle non-2xx responses
  if (!packetaResponse.ok) {
    const errorText = await packetaResponse.text();
    console.error("❌ Packeta XML API error:", {
      status: packetaResponse.status,
      statusText: packetaResponse.statusText,
      error: errorText.substring(0, 200)
    });

    // Return user-friendly error messages
    if (packetaResponse.status === 504) {
      return NextResponse.json(
        { error: "Packeta API is temporarily unavailable (gateway timeout). Please try again in a few minutes." },
        { status: 503 }
      );
    } else if (packetaResponse.status >= 500) {
      return NextResponse.json(
        { error: "Packeta API is experiencing server issues. Please try again in a few minutes." },
        { status: 503 }
      );
    } else if (packetaResponse.status === 401) {
      return NextResponse.json(
        { error: "Packeta API authentication failed. Please check API credentials." },
        { status: 500 }
      );
    } else if (packetaResponse.status === 400) {
      return NextResponse.json(
        { error: "Invalid shipment data. Please check the order details and try again." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: `Packeta XML API error: ${packetaResponse.status} ${packetaResponse.statusText}` },
      { status: 500 }
    );
  }

  const xmlResponse = await packetaResponse.text();
  console.log("✅ Packeta XML API success:", xmlResponse.substring(0, 500));

  // Parse XML response to extract packet ID - simple regex parsing
  const idMatch = xmlResponse.match(/<id[^>]*>([^<]+)<\/id>/i);
  const packetaId = idMatch ? idMatch[1] : null;

  if (!packetaId) {
    console.error("❌ No Packeta ID in XML response:", xmlResponse);
    return NextResponse.json(
      { error: `Invalid Packeta response - missing ID. Response: ${xmlResponse.substring(0, 200)}` },
      { status: 500 }
    );
  }

  // Extract barcode from XML response 
  const barcodeMatch = xmlResponse.match(/<barcode[^>]*>([^<]+)<\/barcode>/i);
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
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
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

