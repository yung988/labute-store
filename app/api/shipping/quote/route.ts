import { NextRequest, NextResponse } from 'next/server';
import { computeQuoteFromItems, type DeliveryMethod, type QuoteItem } from '@/lib/shipping/packeta';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = (body?.items || []) as QuoteItem[];
    const deliveryMethod = (body?.deliveryMethod || 'pickup') as DeliveryMethod;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items' }, { status: 400 });
    }

    const quote = await computeQuoteFromItems(items, deliveryMethod);
    return NextResponse.json({ success: true, quote });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Failed to compute quote';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

