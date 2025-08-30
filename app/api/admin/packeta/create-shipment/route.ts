import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  // Check if Packeta API is temporarily disabled
  if (process.env.PACKETA_API_DISABLED === 'true') {
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
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Check if it's pickup or home delivery
  const isHomeDelivery = order.delivery_method === 'home_delivery';
  
  if (!isHomeDelivery && !order.packeta_point_id) {
    return NextResponse.json({ error: "No Packeta point selected for this pickup order" }, { status: 400 });
  }
  
  if (isHomeDelivery && (!order.delivery_address || !order.delivery_city || !order.delivery_postal_code)) {
    return NextResponse.json({ error: "Missing delivery address for home delivery order" }, { status: 400 });
  }

    // Check required environment variables
    const PACKETA_API_PASSWORD = process.env.PACKETA_API_PASSWORD;
    const eshopId = process.env.PACKETA_ESHOP_ID;

    if (!PACKETA_API_PASSWORD) {
      return NextResponse.json(
        { error: 'Packeta API key is not configured. Please set PACKETA_API_PASSWORD environment variable.' },
        { status: 500 }
      );
    }

   if (!eshopId) {
     return NextResponse.json(
       { error: 'Packeta eshop ID is not configured. Please set PACKETA_ESHOP_ID environment variable.' },
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

      if (items.length > 0) {
        let calculatedWeightKg = 0;

        for (const item of items) {
          // Skip shipping items
          if (item.description?.toLowerCase().includes('shipping') ||
              item.description?.toLowerCase().includes('doprava') ||
              item.description?.toLowerCase().includes('zásilkovna')) {
            continue;
          }

          // Find product by name (case-insensitive partial match)
          const { data: product, error: productError } = await supabaseAdmin
            .from('products')
            .select('name, weight_kg')
            .ilike('name', `%${item.description}%`)
            .single();

          if (productError) {
            continue;
          }

          if (product?.weight_kg) {
            // Weight is already in kg, just multiply by quantity
            const itemWeightKg = product.weight_kg * item.quantity;
            calculatedWeightKg += itemWeightKg;
          }
        }

        if (calculatedWeightKg > 0) {
          // Cap weight at 30kg (Packeta limit) and ensure minimum 0.1kg
          totalWeightKg = Math.max(0.1, Math.min(30, calculatedWeightKg));
        }
      }
    }
  } catch {
    // Use default weight on error
  }

  // Convert amount from cents to CZK and cap values for Packeta limits
  const amountCZK = Math.floor((order.amount_total || 0) / 100); // Convert cents to CZK
  const maxAllowedValue = 50000; // Packeta limit for COD/value
  const safeAmount = Math.min(amountCZK, maxAllowedValue);

  // Format phone number for Packeta API (must have +420 prefix)
  let formattedPhone = order.customer_phone || "";
  if (formattedPhone && !formattedPhone.startsWith('+')) {
    // If phone doesn't start with +, assume it's Czech number and add +420
    formattedPhone = `+420${formattedPhone}`;
  }

  // Use shorter ID for Packeta (last 8 characters of UUID)
  const packetaOrderId = orderId.slice(-8);

  // Split customer name into first name and last name
  const customerName = order.customer_name || "";
  const nameParts = customerName.trim().split(' ');
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(' ') || firstName; // If no lastname, use firstname

   // Weight is already in kg for Packeta XML API (no conversion needed)



  // Build XML request for Packeta REST API
  function xmlEscape(v: string) {
    return v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  }



    // Use the MD5 hash directly from PACKETA_API_PASSWORD (it's already hashed)
    
    // Build XML request - different structure for pickup vs home delivery
    let xmlBody: string;
    
    if (isHomeDelivery) {
      // Home delivery XML structure
      xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<createPacket>
  <apiPassword>${xmlEscape(PACKETA_API_PASSWORD)}</apiPassword>
  <packetAttributes>
    <number>${xmlEscape(packetaOrderId)}</number>
    <name>${xmlEscape(firstName)}</name>
    <surname>${xmlEscape(lastName)}</surname>
    <email>${xmlEscape(order.customer_email || '')}</email>
    <phone>${xmlEscape(formattedPhone)}</phone>
    <addressId>161</addressId>
    <street>${xmlEscape(order.delivery_address || '')}</street>
    <city>${xmlEscape(order.delivery_city || '')}</city>
    <zip>${xmlEscape(order.delivery_postal_code || '')}</zip>
    <cod>${xmlEscape(String(safeAmount))}</cod>
    <value>${xmlEscape(String(safeAmount))}</value>
    <weight>${xmlEscape(String(totalWeightKg))}</weight>
    <eshop>${xmlEscape(eshopId)}</eshop>
  </packetAttributes>
</createPacket>`;
    } else {
      // Pickup point XML structure
      xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<createPacket>
  <apiPassword>${xmlEscape(PACKETA_API_PASSWORD)}</apiPassword>
  <packetAttributes>
    <number>${xmlEscape(packetaOrderId)}</number>
    <name>${xmlEscape(firstName)}</name>
    <surname>${xmlEscape(lastName)}</surname>
    <email>${xmlEscape(order.customer_email || '')}</email>
    <phone>${xmlEscape(formattedPhone)}</phone>
    <addressId>${xmlEscape(order.packeta_point_id)}</addressId>
    <cod>${xmlEscape(String(safeAmount))}</cod>
    <value>${xmlEscape(String(safeAmount))}</value>
    <weight>${xmlEscape(String(totalWeightKg))}</weight>
    <eshop>${xmlEscape(eshopId)}</eshop>
  </packetAttributes>
</createPacket>`;
    }

    const xmlApiUrl = process.env.PACKETA_API_URL || 'https://www.zasilkovna.cz/api/rest';

   // Simple timeout and retry for Packeta XML API
   const MAX_RETRIES = 3;
   const TIMEOUT_MS = 30000; // 30 second timeout

   let packetaResponse: Response | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

         packetaResponse = await fetch(`${xmlApiUrl}`, {
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
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
       


     } catch (error) {
       const err = error as Error;

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
        { error: `Invalid shipment data: ${errorText.substring(0, 200)}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: `Packeta XML API error: ${packetaResponse.status} ${packetaResponse.statusText}` },
      { status: 500 }
    );
  }

   const xmlResponse = await packetaResponse.text();

  // Parse XML response to extract packet ID - simple regex parsing
  const idMatch = xmlResponse.match(/<id[^>]*>([^<]+)<\/id>/i);
  const packetaId = idMatch ? idMatch[1] : null;

  if (!packetaId) {
    return NextResponse.json(
      { error: `Invalid Packeta response - missing ID. Response: ${xmlResponse.substring(0, 200)}` },
      { status: 500 }
    );
  }

  // Extract barcode from XML response 
  const barcodeMatch = xmlResponse.match(/<barcode[^>]*>([^<]+)<\/barcode>/i);
  const packetaBarcode = barcodeMatch ? barcodeMatch[1] : null;

  // Generate tracking ID with Z prefix for customer tracking
  const trackingId = `Z${packetaId}`;
  const trackingUrl = `https://www.zasilkovna.cz/sledovani/${trackingId}`;

  // Update order with Packeta data
  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({
      packeta_shipment_id: packetaId,
      packeta_barcode: packetaBarcode || trackingId,
      packeta_tracking_url: trackingUrl,
      status: "processing",
    })
    .eq("id", orderId);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }

  const deliveryTypeText = isHomeDelivery ? 'home delivery' : 'pickup point';
  
  return NextResponse.json({
    success: true,
    packetaId: packetaId,
    trackingId: trackingId,
    packetaBarcode: packetaBarcode,
    trackingUrl: trackingUrl,
    deliveryMethod: order.delivery_method,
    message: `${deliveryTypeText} shipment created successfully with Packeta ID: ${packetaId} (Customer tracking: ${trackingId})`
  });
}

