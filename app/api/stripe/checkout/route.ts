import { NextRequest, NextResponse } from 'next/server';
import { checkInventoryAvailability, type CartItemForInventory } from '@/lib/inventory';

import { computeQuoteFromItems, type QuoteItem, type DeliveryMethod } from '@/lib/shipping/packeta';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, deliveryMethod, selectedPickupPoint, formData } = body;

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

    if (
      deliveryMethod === 'home_delivery' &&
      (!formData.address || !formData.city || !formData.postalCode)
    ) {
      return NextResponse.json({ error: 'Chybí adresa doručení' }, { status: 400 });
    }

    // Validace dostupnosti skladu před vytvořením Stripe session
    const inventoryItems: CartItemForInventory[] = items
      .filter((item: { productId?: string; size?: string }) => item.productId && item.size)
      .map((item: { productId: string; size: string; quantity: number; name: string }) => ({
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
        name: item.name,
      }));

    if (inventoryItems.length > 0) {
      const availabilityCheck = await checkInventoryAvailability(inventoryItems);

      if (!availabilityCheck.available) {
        return NextResponse.json(
          {
            error: `Nedostatek zásob: ${availabilityCheck.errors.join(', ')}`,
          },
          { status: 400 }
        );
      }

      // Logujeme varování o nízkých zásobách
      if (availabilityCheck.warnings.length > 0) {
        console.warn('⚠️ Low stock warnings:', availabilityCheck.warnings);
      }
    }

    // Pokud máme adresu z pokladny, založíme/naplníme Stripe Customer, aby se billing předvyplnil
    let customerId: string | null = null;
    try {
      // Vytvoření Customer s adresou (neřešíme deduplikaci podle emailu kvůli jednoduchosti)
      const customerParams = new URLSearchParams();
      customerParams.append('email', formData.email);
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      if (fullName) customerParams.append('name', fullName);
      if (formData.phone) customerParams.append('phone', formData.phone);
      if (
        deliveryMethod === 'home_delivery' &&
        formData.address &&
        formData.city &&
        formData.postalCode
      ) {
        // Uložíme adresu jako "billing" (customer.address)
        customerParams.append('address[line1]', formData.address);
        customerParams.append('address[city]', formData.city);
        customerParams.append('address[postal_code]', formData.postalCode);
        customerParams.append('address[country]', 'CZ');

        // A také jako shipping, což Stripe často používá k předvyplnění
        customerParams.append('shipping[name]', fullName || '');
        customerParams.append('shipping[address][line1]', formData.address);
        customerParams.append('shipping[address][city]', formData.city);
        customerParams.append('shipping[address][postal_code]', formData.postalCode);
        customerParams.append('shipping[address][country]', 'CZ');
      }

      // Preferované jazyky pro zákazníka (pomáhá lokalizaci)
      customerParams.append('preferred_locales[0]', 'cs');

      const customerRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: customerParams,
      });

      if (customerRes.ok) {
        const customerJson = await customerRes.json();
        customerId = customerJson.id as string;
      } else {
        const errTxt = await customerRes.text();
        console.warn('⚠️ Failed to create Stripe customer, falling back to customer_email', errTxt);
      }
    } catch (e) {
      console.warn('⚠️ Error while creating Stripe customer, falling back to customer_email', e);
      customerId = null;
    }

    // Build URLSearchParams for Stripe API
    const params = new URLSearchParams();

    // Basic parameters - enable Apple Pay and Google Pay with automatic payment methods
    params.append('automatic_payment_methods[enabled]', 'true');
    params.append('automatic_payment_methods[allow_redirects]', 'never');
    params.append('mode', 'payment');
    params.append(
      'success_url',
      `${request.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}`
    );
    params.append('cancel_url', `${request.nextUrl.origin}/cart`);
    if (customerId) {
      params.append('customer', customerId);
      // Umožní zákazníkovi upravit a uložit údaje zpět do Customer profilu
      params.append('customer_update[address]', 'auto');
      params.append('customer_update[name]', 'auto');
      params.append('customer_update[shipping]', 'auto');
    } else {
      // Fallback
      params.append('customer_email', formData.email);
    }
    // Nekdyž máme Customer s adresou, nevyžadujeme ji znovu (řeší Apple Pay/Google Pay duplicity)
    if (customerId) {
      params.append('billing_address_collection', 'never');
    } else {
      params.append('billing_address_collection', 'auto');
    }
    params.append('phone_number_collection[enabled]', 'true');
    params.append('locale', 'cs');
    params.append('currency', 'czk');

    // Configure Apple Pay and Google Pay to not collect addresses when we already have them
    if (customerId && deliveryMethod === 'home_delivery') {
      // Apple Pay - disable address collection since we have it from customer
      params.append('payment_method_options[apple_pay][setup_future_usage]', 'off_session');
      params.append('payment_method_options[apple_pay][capture_method]', 'automatic');

      // Google Pay - disable address collection since we have it from customer
      params.append('payment_method_options[google_pay][setup_future_usage]', 'off_session');
      params.append('payment_method_options[google_pay][capture_method]', 'automatic');
    }

    // Pro home delivery zachováme údaje v metadata (pro případné budoucí použití)
    if (
      deliveryMethod === 'home_delivery' &&
      formData.address &&
      formData.city &&
      formData.postalCode
    ) {
      params.append('metadata[billing_address_line1]', formData.address);
      params.append('metadata[billing_address_city]', formData.city);
      params.append('metadata[billing_address_postal_code]', formData.postalCode);
      params.append('metadata[billing_name]', `${formData.firstName} ${formData.lastName}`.trim());
      params.append('metadata[billing_phone]', formData.phone);
    }

    // Enable invoice creation for paid orders (může způsobovat "dlužná částka" text)
    // params.append('invoice_creation[enabled]', 'true');

    // Line items - products
    items.forEach(
      (
        item: {
          name: string;
          price: number;
          quantity: number;
          image?: string;
          size?: string;
          productId?: string;
        },
        index: number
      ) => {
        params.append(`line_items[${index}][price_data][currency]`, 'czk');
        params.append(`line_items[${index}][price_data][product_data][name]`, item.name);
        params.append(
          `line_items[${index}][price_data][unit_amount]`,
          Math.round(item.price * 100).toString()
        ); // Convert to cents
        params.append(`line_items[${index}][quantity]`, item.quantity.toString());
        if (item.image) {
          params.append(`line_items[${index}][price_data][product_data][images][0]`, item.image);
        }
        if (item.size) {
          params.append(
            `line_items[${index}][price_data][product_data][description]`,
            `Velikost: ${item.size}`
          );
        }
        // Přidáme product metadata pro inventory tracking
        if (item.productId) {
          params.append(
            `line_items[${index}][price_data][product_data][metadata][product_id]`,
            item.productId
          );
        }
        if (item.size) {
          params.append(
            `line_items[${index}][price_data][product_data][metadata][size]`,
            item.size
          );
        }
      }
    );

    // Shipping as Stripe shipping_options (server-authoritative)
    const quoteItems: QuoteItem[] = items
      .filter((it: { productId?: string; quantity?: number }) => it.productId && it.quantity)
      .map((it: { productId: string; quantity: number }) => ({
        productId: it.productId,
        quantity: it.quantity,
      }));

    const method: DeliveryMethod = deliveryMethod === 'home_delivery' ? 'home_delivery' : 'pickup';
    const serverQuote = await computeQuoteFromItems(quoteItems, method);
    const shippingAmountCents = Math.round(serverQuote.totalCZK * 100);

    params.append('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
    params.append(
      'shipping_options[0][shipping_rate_data][display_name]',
      deliveryMethod === 'pickup' ? 'Zásilkovna - výdejní místo' : 'Zásilkovna - doručení domů'
    );
    params.append(
      'shipping_options[0][shipping_rate_data][fixed_amount][amount]',
      String(shippingAmountCents)
    );
    params.append('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'czk');
    // Optional: keep unspecified tax behavior (let Stripe defaults apply)
    // params.append('shipping_options[0][shipping_rate_data][tax_behavior]', 'unspecified');

    // Collect shipping address only for home delivery, but not if we already have Customer with address
    if (deliveryMethod === 'home_delivery' && !customerId) {
      params.append('shipping_address_collection[allowed_countries][0]', 'CZ');
    }

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
      params.append(
        'custom_fields[2][text][default_value]',
        `${selectedPickupPoint.street || ''}, ${selectedPickupPoint.zip || ''} ${selectedPickupPoint.city || ''}`.trim()
      );
    }

    // Metadata
    params.append('metadata[delivery_method]', deliveryMethod);
    params.append('metadata[customer_first_name]', formData.firstName);
    params.append('metadata[customer_last_name]', formData.lastName);
    params.append('metadata[customer_phone]', formData.phone);
    // Uložíme shipping_amount pro případný fallback v DB
    params.append('metadata[shipping_amount]', String(shippingAmountCents));

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
    params.append(
      'metadata[cart_items]',
      JSON.stringify(
        items.map(
          (item: { productId?: string; size?: string; quantity: number; name: string }) => ({
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
            name: item.name,
          })
        )
      )
    );

    // Debug logging
    const paramKeys = Array.from(params.keys());
    console.log('Creating Stripe checkout session with params:', {
      itemCount: items.length,
      deliveryMethod,
      usingCustomer: !!customerId,
      hasPickupPoint: !!selectedPickupPoint,
      // Log only keys to avoid leaking any sensitive values
      paramKeys,
    });

    // Create Stripe Checkout Session
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Try to parse JSON error for clearer logs
      let errorJson: unknown = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch {}
      console.error('Stripe API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorJson ?? errorText,
        // Include param keys we sent to Stripe for diagnosis
        sentParamKeys: Array.from(params.keys()),
      });
      return NextResponse.json(
        {
          error: `Stripe API error: ${response.status} - ${errorText}`,
        },
        { status: response.status }
      );
    }

    const session = await response.json();
    console.log('Stripe session created successfully:', session.id);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Chyba při vytváření Stripe session:', error);
    return NextResponse.json({ error: 'Chyba při vytváření platby' }, { status: 500 });
  }
}
