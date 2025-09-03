import { NextRequest, NextResponse } from 'next/server';
// Uses unified /api/send-email endpoint

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, orderId = 'TEST-001', customerName = 'Test Customer' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Create test order data (for logging/response only)
    const order = {
      id: orderId,
      customer_email: email,
      customer_name: customerName,
      customer_phone: '+420 123 456 789',
      packeta_point_id: null,
      status: 'paid',
    };

    // Legacy HTML removed; using unified API
    /*
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Potvrzení objednávky - YEEZUZ2020</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #000; margin: 0;">YEEZUZ2020</h1>
            <p style="color: #666; margin: 10px 0;">Oficiální e-shop YEEZUZ2020</p>
          </div>

          <div style="background: #f8f8f8; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="color: #000; margin-top: 0;">Děkujeme za Vaši objednávku!</h2>
            <p style="color: #333; line-height: 1.6;">
              Vaše objednávka číslo <strong>${order.id}</strong> byla úspěšně zpracována a zaplacena.
            </p>
            <p style="color: #d32f2f; font-weight: bold;">
              ⚠️ TOTO JE TESTOVACÍ EMAIL - objednávka nebyla skutečně provedena
            </p>
          </div>

          <div style="background: #fff; border: 1px solid #eee; padding: 20px; border-radius: 5px; margin-bottom: 30px;">
            <h3 style="color: #000; margin-top: 0;">Údaje o objednávce:</h3>
            <p><strong>Jméno:</strong> ${order.customer_name}</p>
            <p><strong>Email:</strong> ${order.customer_email}</p>
            <p><strong>Telefon:</strong> ${order.customer_phone}</p>
            <p><strong>Číslo objednávky:</strong> ${order.id}</p>
            <p><strong>Status:</strong> Test - ${order.status === 'paid' ? 'Zaplaceno' : order.status}</p>
          </div>

          <div style="background: #000; color: white; padding: 30px; border-radius: 10px; text-align: center;">
            <h3 style="margin-top: 0;">Test dokončen</h3>
            <p style="line-height: 1.6; margin-bottom: 0;">
              Tento email byl odeslán pro testování webhook systému.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
            <p>Tento email byl automaticky vygenerován - neodpovídejte na něj.</p>
            <p>© 2024 YEEZUZ2020. Všechna práva vyhrazena.</p>
          </div>
        </body>
      </html>
    */

    const resp = await fetch(`${process.env.SITE_URL || ''}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'order-confirmation',
        to: email,
        data: {
          orderId: order.id,
          customerEmail: email,
          items: [
            { name: 'Test Tričko', qty: 1, price: '500 Kč' },
            { name: 'Test Mikina', qty: 1, price: '1,200 Kč' },
          ],
          total: '1,700 Kč',
        },
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('Error sending test email:', errorText);
      return NextResponse.json({ error: 'Failed to send email', details: errorText }, { status: resp.status });
    }

    const data = await resp.json();

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      data,
      testData: order,
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({ error: 'Test email failed' }, { status: 500 });
  }
}
