import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAdminAuthWithParams } from '@/lib/middleware/admin-verification';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/admin/tickets/[id]/reply - Odpověď na ticket
async function postHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const body = await req.json();
    const { message, is_internal_note = false, sender_email } = body;

    if (!message || !sender_email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Načti ticket info
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Ulož odpověď do databáze
    const { data: reply, error: replyError } = await supabaseAdmin
      .from('ticket_replies')
      .insert({
        ticket_id: id,
        sender_email,
        sender_type: 'staff',
        message,
        is_internal_note,
      })
      .select()
      .single();

    if (replyError) {
      console.error('Error creating reply:', replyError);
      return NextResponse.json({ error: replyError.message }, { status: 500 });
    }

    // Pokud není interní poznámka, pošli email zákazníkovi
    if (!is_internal_note) {
      try {
        const { render } = await import('@react-email/render');
        const TicketReply = (await import('@/emails/TicketReply')).default;

        const emailHtml = await render(
          TicketReply({
            ticketNumber: ticket.ticket_number,
            subject: ticket.subject,
            message,
            customerEmail: ticket.customer_email,
          })
        );

        await resend.emails.send({
          from: 'YEEZUZ2020 Support <help@support.yeezuz2020.cz>',
          to: ticket.customer_email,
          subject: `Re: ${ticket.subject}`,
          html: emailHtml,
        });

        // Update ticket status na in_progress pokud byl open
        if (ticket.status === 'open') {
          await supabaseAdmin
            .from('support_tickets')
            .update({ status: 'in_progress' })
            .eq('id', id);
        }

      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Nevrátíme error, protože reply byla uložena
      }
    }

    return NextResponse.json({ reply }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/admin/tickets/[id]/reply:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuthWithParams(postHandler);
