import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { withAdminAuth } from '@/lib/middleware/admin-verification';

const resend = new Resend(process.env.RESEND_API_KEY);

async function handlePost(req: NextRequest) {
  try {
    const { testEmail } = await req.json();

    if (!testEmail) {
      return NextResponse.json({ error: 'Chybí testEmail parametr' }, { status: 400 });
    }

    // Odeslání test e-mailu na info@yeezuz2020.cz
    const { data, error } = await resend.emails.send({
      from: 'Test <noreply@yeezuz2020.cz>',
      to: 'info@yeezuz2020.cz',
      subject: 'Test e-mailového forwarding',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>🧪 Test e-mailového forwarding</h2>
          <p>Tento e-mail testuje, jestli forwarding z <strong>info@yeezuz2020.cz</strong> na váš e-mail funguje správně.</p>

          <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Test odeslán:</strong> ${new Date().toLocaleString('cs-CZ')}<br>
            <strong>Test e-mail:</strong> ${testEmail}
          </div>

          <p>Pokud tento e-mail vidíte ve vaší schránce, forwarding funguje! ✅</p>

          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            Tento test byl odeslán z aplikace yeezuz2020.cz
          </p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Chyba při odesílání test e-mailu', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test e-mail odeslán na info@yeezuz2020.cz',
      emailId: data?.id,
      testEmail: testEmail,
    });
  } catch (error) {
    console.error('Test email forwarding error:', error);
    return NextResponse.json({ error: 'Neočekávaná chyba při testování' }, { status: 500 });
  }
}

export const POST = withAdminAuth(handlePost);

// GET endpoint pro jednoduchý test
async function handleGet() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Test <noreply@yeezuz2020.cz>',
      to: 'info@yeezuz2020.cz',
      subject: 'Automatický test forwarding',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>🔄 Automatický test forwarding</h2>
          <p>Tento e-mail byl odeslán automaticky pro testování e-mailového forwarding.</p>
          <p><strong>Čas odeslání:</strong> ${new Date().toLocaleString('cs-CZ')}</p>
          <p>Pokud ho vidíte, forwarding funguje správně! 🎉</p>
        </div>
      `,
    });

    if (error || !data) {
      return NextResponse.json(
        {
          error: 'Chyba při odesílání test e-mailu',
          details: error?.message || 'Neznámá chyba',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test e-mail odeslán na info@yeezuz2020.cz',
      emailId: data?.id,
    });
  } catch {
    return NextResponse.json({ error: 'Neočekávaná chyba' }, { status: 500 });
  }
}

export const GET = withAdminAuth(handleGet);
