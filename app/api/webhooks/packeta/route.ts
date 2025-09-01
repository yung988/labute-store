// NOTE: Packeta DOES NOT support webhooks!
// This endpoint was created based on incorrect information.
// Use Supabase Edge Function 'packeta-status-checker' with polling instead.

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Packeta does not support webhooks',
      info: 'This endpoint was created based on incorrect information about Packeta API capabilities.',
      solution:
        "Use the Supabase Edge Function 'packeta-status-checker' with scheduled polling instead.",
    },
    { status: 501 }
  ); // Not Implemented
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'disabled',
    webhook: 'packeta',
    message: 'Packeta webhooks are not supported. Using polling instead.',
    timestamp: new Date().toISOString(),
  });
}
