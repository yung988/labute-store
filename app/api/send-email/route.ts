import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  OrderConfirmation,
  ShippingConfirmation,
  DeliveredConfirmation,
  BRAND,
  type OrderConfirmationProps,
  type ShippingConfirmationProps,
  type DeliveredConfirmationProps,
} from '@/emails';
import { supabaseAdmin } from '@/lib/supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email type definitions

type EmailRequest =
  | { type: 'order-confirmation'; to: string; data: OrderConfirmationProps }
  | { type: 'shipping-confirmation'; to: string; data: ShippingConfirmationProps }
  | { type: 'delivered-confirmation'; to: string; data: DeliveredConfirmationProps }
  | {
      type: 'status-update';
      to: string;
      data: { orderId: string; status: string; customerName?: string; customerEmail: string; items?: unknown[] };
    };

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });
    }

    const body: EmailRequest = await request.json();
    const { type, to, data } = body;


    // Validate request
    if (!type || !to || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, to, data' },
        { status: 400 }
      );
    }

    // Validate email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    let emailComponent;
    let subject;
    let orderId = '';

    // Select appropriate template and subject based on type
    switch (type) {
      case 'order-confirmation':
        const orderData = data as OrderConfirmationProps;
        emailComponent = OrderConfirmation(orderData);
        subject = `Potvrzení objednávky ${orderData.orderId}`;
        orderId = orderData.orderId;
        break;

      case 'shipping-confirmation':
        const shippingData = data as ShippingConfirmationProps;
        emailComponent = ShippingConfirmation(shippingData);
        subject = `Objednávka ${shippingData.orderId} je na cestě`;
        orderId = shippingData.orderId;
        break;

      case 'delivered-confirmation':
        const deliveredData = data as DeliveredConfirmationProps;
        emailComponent = DeliveredConfirmation(deliveredData);
        subject = `Objednávka ${deliveredData.orderId} byla doručena`;
        orderId = deliveredData.orderId;
        break;

      case 'status-update': {
        const d = data as { orderId: string; status: string; customerName?: string; customerEmail: string; items?: unknown[] };
        const { StatusUpdate } = await import('@/emails');
        emailComponent = StatusUpdate({
          orderId: d.orderId,
          status: d.status as string,
          customerName: d.customerName,
          customerEmail: d.customerEmail,
          items: Array.isArray(d.items)
            ? (d.items as Array<{ name?: string; quantity?: number; size?: string; color?: string }>).
                map((it) => ({ name: it.name, quantity: it.quantity, size: it.size, color: it.color }))
            : [],
        });
        subject = `Změna stavu objednávky #${d.orderId.slice(-8)}`;
        orderId = d.orderId;
        break;
      }

      default:
        return NextResponse.json(
          {
            error:
              'Invalid email type. Must be: order-confirmation, shipping-confirmation, delivered-confirmation, or status-update',
          },
          { status: 400 }
        );
    }

    // Idempotency check - prevent duplicate emails within 5 minutes
    if (orderId) {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: existingEmail } = await supabaseAdmin
          .from('email_logs')
          .select('id, created_at')
          .eq('order_id', orderId)
          .eq('email_type', type)
          .gte('created_at', fiveMinutesAgo)
          .limit(1);

        if (existingEmail && existingEmail.length > 0) {
          console.log(
            `⏭️ Skipping duplicate ${type} email for order ${orderId} (already sent at ${existingEmail[0].created_at})`
          );
          return NextResponse.json({
            success: true,
            message: 'Email already sent recently - skipped duplicate',
            duplicate: true,
            orderId,
            type,
            existingEmailId: existingEmail[0].id,
          });
        }
      } catch (checkError) {
        // Log but continue - don't block email sending if check fails
        console.warn('Idempotency check failed (continuing with send):', checkError);
      }
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: `${BRAND.name} <${process.env.FROM_EMAIL || BRAND.supportEmail}>`,
      to: [to],
      subject,
      react: emailComponent,
      headers: {
        'X-Order-ID': orderId,
        'X-Email-Type': type,
      },
    });

    // Log email to email_logs (best-effort)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerId = (emailResponse as any)?.data?.id || null;
      await supabaseAdmin.from('email_logs').insert({
        order_id: orderId || null,
        customer_email: to,
        email_type: type,
        subject,
        status: 'sent',
        provider: 'resend',
        provider_id: providerId,
        metadata: { trigger: 'app-api' },
      });
    } catch (e) {
      console.warn('Email log insertion failed (non-blocking):', e);
    }

    if (emailResponse.error) {
      console.error('Resend error:', emailResponse.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: emailResponse.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      emailId: emailResponse.data?.id,
      type,
      orderId,
    });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Example usage documentation
export async function GET() {
  const examples = {
    orderConfirmation: {
      type: 'order-confirmation',
      to: 'customer@example.com',
      data: {
        orderId: 'YZ-2024-001234',
        customerName: 'Jan Novák',
        customerEmail: 'customer@example.com',
        orderDate: new Date().toISOString(),
        items: [
          {
            name: 'Triko Labuť - Černá',
            qty: 2,
            price: '1,200 Kč',
          },
        ],
        total: '1,200 Kč',
        shippingAddress: {
          street: 'Wenceslas Square 1',
          city: 'Praha',
          postalCode: '110 00',
          country: 'Česká republika',
        },
      },
    },
    shippingConfirmation: {
      type: 'shipping-confirmation',
      to: 'customer@example.com',
      data: {
        orderId: 'YZ-2024-001234',
        customerName: 'Jan Novák',
        customerEmail: 'customer@example.com',
        trackingUrl: 'https://tracking-url.com',
        trackingNumber: 'DR1234567890CZ',
      },
    },
    deliveredConfirmation: {
      type: 'delivered-confirmation',
      to: 'customer@example.com',
      data: {
        orderId: 'YZ-2024-001234',
        customerName: 'Jan Novák',
        customerEmail: 'customer@example.com',
        feedbackUrl: 'https://feedback-url.com',
      },
    },
  };

  return NextResponse.json({
    message: 'Email API Endpoint',
    method: 'POST',
    examples,
    previewUrls: {
      orderConfirmation: '/preview/order-confirmation',
      shippingConfirmation: '/preview/shipping-confirmation',
      deliveredConfirmation: '/preview/delivered-confirmation',
    },
  });
}
