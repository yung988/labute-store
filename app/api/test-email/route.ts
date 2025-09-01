import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, orderId = 'TEST-001', customerName = 'Test Customer' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Create test order data
    const order = {
      id: orderId,
      customer_email: email,
      customer_name: customerName,
      customer_phone: '+420 123 456 789',
      packeta_point_id: null,
      status: 'paid',
    };

    // Send confirmation email
    const emailHtml = `
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
    `;

    const { data, error } = await resend.emails.send({
      from: 'YEEZUZ2020 <noreply@yeezuz2020.store>',
      to: [email],
      subject: `[TEST] Potvrzení objednávky ${order.id} - YEEZUZ2020`,
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending test email:', error);
      return NextResponse.json({ error: 'Failed to send email', details: error }, { status: 500 });
    }

    console.log('Test email sent successfully:', data);

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      data: data,
      testData: order,
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({ error: 'Test email failed' }, { status: 500 });
  }
}
