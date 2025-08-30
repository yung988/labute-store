import { NextRequest, NextResponse } from 'next/server';
import { checkInventoryAvailability, type CartItemForInventory } from '@/lib/inventory';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items,
      deliveryMethod,
      selectedPickupPoint,
      formData,
      deliveryPrice
    } = body;

    // Validace
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Košík je prázdný' }, { status: 400 });
    }

    if (!formData.email || !formData.firstName || !formData.lastName || !formData.phone) {
      return NextResponse.json({ error: 'Chybí povinné údaje' }, { status: 400 });
    }

    if (deliveryMethod === 'pickup' && !selectedPickupPoint) {
      return NextResponse.json({ error: 'Vyberte výdejní místo' }, { status: 400 });
    }

    if (deliveryMethod === 'home_delivery' && (!formData.address || !formData.city || !formData.postalCode)) {
      return NextResponse.json({ error: 'Chybí adresa doručení' }, { status: 400 });
    }

    // Validace dostupnosti skladu před vytvořením Stripe session
    const inventoryItems: CartItemForInventory[] = items
      .filter((item: { productId?: string; size?: string }) => item.productId && item.size)
      .map((item: { productId: string; size: string; quantity: number; name: string }) => ({
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
        name: item.name
      }));

    if (inventoryItems.length > 0) {
      const availabilityCheck = await checkInventoryAvailability(inventoryItems);
      
      if (!availabilityCheck.available) {
        return NextResponse.json({ 
          error: `Nedostatek zásob: ${availabilityCheck.errors.join(', ')}` 
        }, { status: 400 });
      }
      
      // Logujeme varování o nízkých zásobách
      if (availabilityCheck.warnings.length > 0) {
        console.warn("⚠️ Low stock warnings:", availabilityCheck.warnings);
      }
    }

        // Build URLSearchParams for Stripe API
    const params = new URLSearchParams();

    // Basic parameters
    params.append('payment_method_types[0]', 'card');
    params.append('mode', 'payment');
    params.append('success_url', `${request.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${request.nextUrl.origin}/cart`);
    params.append('customer_email', formData.email);
    params.append('billing_address_collection', deliveryMethod === 'home_delivery' ? 'required' : 'auto');
    params.append('phone_number_collection[enabled]', 'true');
    params.append('locale', 'cs');
    params.append('currency', 'czk');

    // Enable invoice creation for paid orders
    params.append('invoice_creation[enabled]', 'true');

    // Line items - products
    items.forEach((item: { name: string; price: number; quantity: number; image?: string; size?: string; productId?: string }, index: number) => {
      params.append(`line_items[${index}][price_data][currency]`, 'czk');
      params.append(`line_items[${index}][price_data][product_data][name]`, item.name);
      params.append(`line_items[${index}][price_data][unit_amount]`, Math.round(item.price * 100).toString()); // Convert to cents
      params.append(`line_items[${index}][quantity]`, item.quantity.toString());
      if (item.image) {
        params.append(`line_items[${index}][price_data][product_data][images][0]`, item.image);
      }
      if (item.size) {
        params.append(`line_items[${index}][price_data][product_data][description]`, `Velikost: ${item.size}`);
      }
      // Přidáme product metadata pro inventory tracking
      if (item.productId) {
        params.append(`line_items[${index}][price_data][product_data][metadata][product_id]`, item.productId);
      }
      if (item.size) {
        params.append(`line_items[${index}][price_data][product_data][metadata][size]`, item.size);
      }
    });

    // Add shipping as line item
    const shippingIndex = items.length;
    params.append(`line_items[${shippingIndex}][price_data][currency]`, 'czk');
    params.append(`line_items[${shippingIndex}][price_data][product_data][name]`,
      deliveryMethod === 'pickup' ? 'Zásilkovna - výdejní místo' : 'Zásilkovna - doručení domů');
    params.append(`line_items[${shippingIndex}][price_data][unit_amount]`, Math.round(deliveryPrice * 100).toString()); // Convert to cents
    params.append(`line_items[${shippingIndex}][quantity]`, '1');

    // Custom fields for pickup point
    if (deliveryMethod === 'pickup' && selectedPickupPoint) {
      params.append('custom_fields[0][key]', 'pickup_point_id');
      params.append('custom_fields[0][label][type]', 'custom');
      params.append('custom_fields[0][label][custom]', 'ID výdejního místa');
      params.append('custom_fields[0][type]', 'text');
      params.append('custom_fields[0][text][default_value]', selectedPickupPoint.id);

      params.append('custom_fields[1][key]', 'pickup_point_name');
      params.append('custom_fields[1][label][type]', 'custom');
      params.append('custom_fields[1][label][custom]', 'Název výdejního místa');
      params.append('custom_fields[1][type]', 'text');
      params.append('custom_fields[1][text][default_value]', selectedPickupPoint.name || '');

      params.append('custom_fields[2][key]', 'pickup_point_address');
      params.append('custom_fields[2][label][type]', 'custom');
      params.append('custom_fields[2][label][custom]', 'Adresa výdejního místa');
      params.append('custom_fields[2][type]', 'text');
      params.append('custom_fields[2][text][default_value]',
        `${selectedPickupPoint.street || ''}, ${selectedPickupPoint.zip || ''} ${selectedPickupPoint.city || ''}`.trim());
    }

    // Metadata
    params.append('metadata[delivery_method]', deliveryMethod);
    params.append('metadata[customer_first_name]', formData.firstName);
    params.append('metadata[customer_last_name]', formData.lastName);
    params.append('metadata[customer_phone]', formData.phone);
    
    // Add pickup point ID to metadata as backup
    if (deliveryMethod === 'pickup' && selectedPickupPoint) {
      params.append('metadata[packeta_point_id]', selectedPickupPoint.id);
    }

    if (deliveryMethod === 'home_delivery') {
      params.append('metadata[delivery_address]', formData.address);
      params.append('metadata[delivery_city]', formData.city);
      params.append('metadata[delivery_postal_code]', formData.postalCode);
    }

    // Přidáme cart items do metadata pro inventory tracking
    params.append('metadata[cart_items]', JSON.stringify(
      items.map((item: { productId?: string; size?: string; quantity: number; name: string }) => ({
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
        name: item.name
      }))
    ));

    // Debug logging
    console.log('Creating Stripe checkout session with params:', {
      itemCount: items.length,
      deliveryMethod,
      deliveryPrice,
      customerEmail: formData.email,
      hasPickupPoint: !!selectedPickupPoint
    });

    // Create Stripe Checkout Session
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Stripe API error:', {
        status: response.status,
        statusText: response.statusText,
        error: error
      });
      return NextResponse.json({
        error: `Stripe API error: ${response.status} - ${error}`
      }, { status: response.status });
    }

    const session = await response.json();
    console.log('Stripe session created successfully:', session.id);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Chyba při vytváření Stripe session:', error);
    return NextResponse.json(
      { error: 'Chyba při vytváření platby' },
      { status: 500 }
    );
  }
}