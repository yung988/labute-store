import { NextRequest, NextResponse } from 'next/server';

/**
 * Cron endpoint to process Telegram notification queue
 * Calls the Supabase Edge Function telegram-queue-processor
 * Schedule: Every 5 minutes (configured in vercel.json)
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const cronSecret = req.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error('CRON_SECRET environment variable is not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (cronSecret !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase credentials not configured');
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    console.log('🔄 Starting Telegram queue processing...');

    const response = await fetch(`${supabaseUrl}/functions/v1/telegram-queue-processor`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telegram queue processor failed:', response.status, errorText);
      return NextResponse.json(
        {
          error: 'Telegram queue processor failed',
          status: response.status,
          details: errorText,
        },
        { status: 502 }
      );
    }

    const result = await response.json();
    console.log('✅ Telegram queue processed:', result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error('Error calling Telegram queue processor:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
