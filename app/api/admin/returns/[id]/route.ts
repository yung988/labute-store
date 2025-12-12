import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAdminAuthWithParams } from '@/lib/middleware/admin-verification';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// GET /api/admin/returns/[id] - Detail return requestu
async function getHandler(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { data: returnReq, error } = await supabaseAdmin
      .from('return_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Return request not found' }, { status: 404 });
      }
      console.error('Error fetching return request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Načti info o objednávce
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', returnReq.order_id)
      .single();

    return NextResponse.json({
      return: returnReq,
      order
    });

  } catch (error) {
    console.error('Error in GET /api/admin/returns/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuthWithParams(getHandler);

// PATCH /api/admin/returns/[id] - Update return requestu (schválení/zamítnutí)
async function patchHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    // Povolené fieldy
    if (body.status) updates.status = body.status;
    if (body.refund_amount !== undefined) updates.refund_amount = body.refund_amount;
    if (body.refund_method) updates.refund_method = body.refund_method;
    if (body.admin_notes !== undefined) updates.admin_notes = body.admin_notes;

    // Pokud se mění status, nastav processed_at
    if (body.status && ['approved', 'rejected', 'refunded'].includes(body.status)) {
      updates.processed_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Načti aktuální stav
    const { data: currentReturn } = await supabaseAdmin
      .from('return_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentReturn) {
      return NextResponse.json({ error: 'Return request not found' }, { status: 404 });
    }

    // Update return request
    const { data: returnReq, error } = await supabaseAdmin
      .from('return_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating return request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Pošli email zákazníkovi pokud se změnil status
    if (body.status && body.status !== currentReturn.status) {
      try {
        await sendReturnStatusEmail(returnReq, body.status);
      } catch (emailError) {
        console.error('Error sending status email:', emailError);
      }
    }

    return NextResponse.json({ return: returnReq });

  } catch (error) {
    console.error('Error in PATCH /api/admin/returns/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PATCH = withAdminAuthWithParams(patchHandler);

async function sendReturnStatusEmail(returnReq: Record<string, unknown>, newStatus: string) {
  let subject = '';
  let message = '';

  switch (newStatus) {
    case 'approved':
      subject = `Reklamace #${returnReq.return_number} byla schválena`;
      message = `
        <h2>Vaše reklamace byla schválena</h2>
        <p>Dobrý den,</p>
        <p>Vaše reklamace k objednávce <strong>#${returnReq.order_id}</strong> byla schválena.</p>
        <p><strong>Další kroky:</strong></p>
        <ol>
          <li>Zboží nám prosím zašlete zpět na adresu, kterou vám zašleme v samostatném emailu</li>
          <li>Po obdržení zboží vám vrátíme peníze do 14 dnů</li>
        </ol>
        ${returnReq.admin_notes ? `<p><strong>Poznámka:</strong> ${returnReq.admin_notes}</p>` : ''}
      `;
      break;

    case 'rejected':
      subject = `Reklamace #${returnReq.return_number} byla zamítnuta`;
      message = `
        <h2>Vaše reklamace byla zamítnuta</h2>
        <p>Dobrý den,</p>
        <p>Bohužel jsme museli zamítnout vaši reklamaci k objednávce <strong>#${returnReq.order_id}</strong>.</p>
        ${returnReq.admin_notes ? `<p><strong>Důvod:</strong> ${returnReq.admin_notes}</p>` : ''}
        <p>Pokud máte dotazy, odpovězte prosím na tento email.</p>
      `;
      break;

    case 'refunded':
      subject = `Reklamace #${returnReq.return_number} - peníze vráceny`;
      message = `
        <h2>Peníze byly vráceny</h2>
        <p>Dobrý den,</p>
        <p>Vaše reklamace byla úspěšně vyřízena a peníze byly vráceny.</p>
        <p><strong>Částka:</strong> ${returnReq.refund_amount} Kč</p>
        <p>Peníze by měly dorazit na váš účet do 3-5 pracovních dnů.</p>
      `;
      break;

    default:
      return; // Nepošli email pro ostatní statusy
  }

  await resend.emails.send({
    from: 'YEEZUZ2020 Support <returns@support.yeezuz2020.cz>',
    to: returnReq.customer_email as string,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${message}

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />

        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #000;">
          <p style="margin: 0; font-weight: bold;">YEEZUZ2020</p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">
            Official Merch Shop
          </p>
        </div>
      </div>
    `,
  });
}
