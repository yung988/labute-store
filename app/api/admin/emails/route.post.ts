import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-verification';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Allow internal service calls to record a log without admin session
async function allowInternal(req: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET;
  const auth = req.headers.get('authorization') || '';
  if (secret && auth === `Bearer ${secret}`) return true;
  return false;
}

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    // If called externally (e.g., app/api/send-email), allow with INTERNAL_API_SECRET
    await allowInternal(req); // currently not used, could be leveraged to bypass admin session
    const body = await req.json();

    const { data, error } = await supabaseAdmin.from('email_logs').insert({
      order_id: body.order_id || null,
      customer_email: body.customer_email,
      email_type: body.email_type,
      subject: body.subject,
      status: body.status || 'sent',
      provider: body.provider || 'resend',
      provider_id: body.provider_id || null,
      metadata: body.metadata || {},
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ error: 'Failed to insert email log' }, { status: 500 });
  }
});

