// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: packeta-status-check
// Periodically calls Next.js endpoint /api/cron/packeta-status-check with CRON_SECRET.
// Configure the following environment variables in Supabase for this function:
// - SITE_URL: public base URL of your deployed Next app (e.g., https://yourapp.vercel.app)
// - CRON_SECRET: must match process.env.CRON_SECRET used by Next route
//
// In Supabase dashboard: Functions -> packeta-status-check -> Schedule (e.g., */30 * * * *)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

Deno.serve(async (_req: Request) => {
  const SITE_URL = Deno.env.get('SITE_URL');
  const CRON_SECRET = Deno.env.get('CRON_SECRET');

  if (!SITE_URL || !CRON_SECRET) {
    const missing = [!SITE_URL && 'SITE_URL', !CRON_SECRET && 'CRON_SECRET']
      .filter(Boolean)
      .join(', ');
    return new Response(JSON.stringify({ error: `Missing required env(s): ${missing}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = `${SITE_URL.replace(/\/$/, '')}/api/cron/packeta-status-check`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        Accept: 'application/json',
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const body = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: 'Upstream cron call failed',
          status: res.status,
          body,
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: true, upstream: body }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Edge function error', message: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
