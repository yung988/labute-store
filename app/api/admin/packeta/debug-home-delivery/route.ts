import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
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

  // Check if it's home delivery
  const isHomeDelivery = order.delivery_method === 'home_delivery';
  
  if (!isHomeDelivery) {
    return NextResponse.json({ error: "This is not a home delivery order" }, { status: 400 });
  }
  
  if (!order.delivery_address || !order.delivery_city || !order.delivery_postal_code) {
    return NextResponse.json({ error: "Missing delivery address for home delivery order" }, { status: 400 });
  }

  // Check required environment variables
  const PACKETA_API_PASSWORD = process.env.PACKETA_API_PASSWORD;
  const eshopId = process.env.PACKETA_ESHOP_ID;

  if (!PACKETA_API_PASSWORD || !eshopId) {
    return NextResponse.json({ error: 'Missing API credentials' }, { status: 500 });
  }

  // Calculate total weight from order items (in kg for Packeta API)
  const totalWeightKg = 0.5; // Default 0.5kg fallback

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

  // Build XML request for Packeta REST API
  function xmlEscape(v: string) {
    return v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  }

  // Home delivery XML structure
  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
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

  return NextResponse.json({
    debug: true,
    order: {
      id: orderId,
      delivery_method: order.delivery_method,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      delivery_address: order.delivery_address,
      delivery_city: order.delivery_city,
      delivery_postal_code: order.delivery_postal_code,
      amount_total: order.amount_total
    },
    processed: {
      firstName,
      lastName,
      formattedPhone,
      packetaOrderId,
      safeAmount,
      totalWeightKg
    },
    xmlBody,
    apiUrl: process.env.PACKETA_API_URL || 'https://www.zasilkovna.cz/api/rest'
  });
}