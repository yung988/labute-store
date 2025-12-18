import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST /api/returns - Customer submits a return request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, email, reason, items, description } = body;

    // Validate required fields
    if (!orderId || !email || !reason) {
      return NextResponse.json(
        { error: 'Chybí povinná pole: orderId, email, reason' },
        { status: 400 }
      );
    }

    // Find the order and verify email matches
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Objednávka nebyla nalezena' },
        { status: 404 }
      );
    }

    // Verify email matches
    if (order.customer_email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email neodpovídá objednávce' },
        { status: 403 }
      );
    }

    // Check if order is eligible for return (must be delivered, within 14 days)
    const orderDate = new Date(order.created_at);
    const daysSinceOrder = Math.floor(
      (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceOrder > 14) {
      return NextResponse.json(
        { error: 'Lhůta pro vrácení zboží (14 dní) již uplynula' },
        { status: 400 }
      );
    }

    // Check if there's already a pending return request
    const { data: existingReturn } = await supabaseAdmin
      .from('return_requests')
      .select('id, status')
      .eq('order_id', orderId)
      .in('status', ['pending', 'approved'])
      .single();

    if (existingReturn) {
      return NextResponse.json(
        { error: 'Pro tuto objednávku již existuje žádost o vrácení' },
        { status: 400 }
      );
    }

    // Create return request
    const { data: returnRequest, error: insertError } = await supabaseAdmin
      .from('return_requests')
      .insert({
        order_id: orderId,
        customer_email: email,
        customer_name: order.customer_name,
        reason,
        items: items || order.items,
        description: description || null,
        status: 'pending',
        amount: order.amount_total,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating return request:', insertError);
      return NextResponse.json(
        { error: 'Nepodařilo se vytvořit žádost o vrácení' },
        { status: 500 }
      );
    }

    // Send notification to admin via Telegram
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;
    if (telegramBotToken && telegramChatId) {
      try {
        await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: `🔄 <b>NOVÁ ŽÁDOST O VRÁCENÍ</b>\n\n📋 Objednávka: <b>${orderId}</b>\n👤 Zákazník: ${order.customer_name}\n📧 Email: ${email}\n\n📝 Důvod: ${reason}\n${description ? `💬 Popis: ${description}` : ''}\n\n💰 Částka: ${((order.amount_total || 0) / 100).toFixed(0)} Kč`,
            parse_mode: 'HTML',
          }),
        });
      } catch (e) {
        console.error('Failed to send Telegram notification:', e);
      }
    }

    return NextResponse.json({
      success: true,
      returnId: returnRequest.id,
      message: 'Žádost o vrácení byla úspěšně odeslána. Budeme vás kontaktovat emailem.',
    });
  } catch (error) {
    console.error('Error in POST /api/returns:', error);
    return NextResponse.json(
      { error: 'Interní chyba serveru' },
      { status: 500 }
    );
  }
}

// GET /api/returns?orderId=XXX&email=YYY - Customer checks return status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const email = searchParams.get('email');

    if (!orderId || !email) {
      return NextResponse.json(
        { error: 'Chybí povinné parametry: orderId, email' },
        { status: 400 }
      );
    }

    // Find the order first
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, customer_email, customer_name, items, amount_total, status, created_at')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Objednávka nebyla nalezena' },
        { status: 404 }
      );
    }

    // Verify email
    if (order.customer_email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email neodpovídá objednávce' },
        { status: 403 }
      );
    }

    // Check for existing return request
    const { data: returnRequest } = await supabaseAdmin
      .from('return_requests')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Calculate if return is still eligible
    const orderDate = new Date(order.created_at);
    const daysSinceOrder = Math.floor(
      (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isEligible = daysSinceOrder <= 14;
    const daysRemaining = Math.max(0, 14 - daysSinceOrder);

    return NextResponse.json({
      order: {
        id: order.id,
        customerName: order.customer_name,
        items: order.items,
        amountTotal: order.amount_total,
        status: order.status,
        createdAt: order.created_at,
      },
      returnRequest: returnRequest || null,
      eligibility: {
        isEligible,
        daysRemaining,
        message: isEligible
          ? `Máte ještě ${daysRemaining} dní na vrácení zboží`
          : 'Lhůta pro vrácení zboží již uplynula',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/returns:', error);
    return NextResponse.json(
      { error: 'Interní chyba serveru' },
      { status: 500 }
    );
  }
}
