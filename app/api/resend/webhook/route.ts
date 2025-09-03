import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Webhook } from 'svix';

function verifyResendSignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return false;
  const msgId = req.headers.get('svix-id') || '';
  const msgTimestamp = req.headers.get('svix-timestamp') || '';
  const msgSignature = req.headers.get('svix-signature') || '';
  const wh = new Webhook(secret);
  try {
    wh.verify(rawBody, {
      'svix-id': msgId,
      'svix-timestamp': msgTimestamp,
      'svix-signature': msgSignature,
    });
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();

    // If secret set, verify Svix signature
    if (process.env.RESEND_WEBHOOK_SECRET) {
      const ok = verifyResendSignature(req, raw);
      if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(raw);
    // Body example contains 'type' (e.g., 'email.delivered') and 'data' with id, to, etc.
    const eventType: string = body?.type || '';
    const emailId: string | undefined = body?.data?.id;
    const to: string | undefined = body?.data?.to?.[0] || body?.data?.to;

    if (!emailId) {
      return NextResponse.json({ error: 'Missing email id' }, { status: 400 });
    }

    const status = eventType.includes('delivered')
      ? 'delivered'
      : eventType.includes('bounced')
        ? 'bounced'
        : eventType.includes('opened')
          ? 'opened'
          : undefined;

    if (!status) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const updates: Record<string, unknown> = { status };
    if (status === 'delivered') updates['delivered_at'] = new Date().toISOString();
    if (status === 'opened') updates['opened_at'] = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('email_logs')
      .update(updates)
      .eq('provider_id', emailId)
      .eq('customer_email', to ?? undefined);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

