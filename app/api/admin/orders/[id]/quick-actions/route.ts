import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { action } = await request.json();
    const { id: orderId } = await params;

    const supabase = await createClient();

    switch (action) {
      case 'mark_shipped':
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: 'shipped',
            shipped_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        return NextResponse.json({ success: true, message: 'Objednávka označena jako odeslaná' });

      case 'mark_processing':
        const { error: processingError } = await supabase
          .from('orders')
          .update({
            status: 'processing',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        if (processingError) {
          throw new Error(processingError.message);
        }

        return NextResponse.json({
          success: true,
          message: 'Objednávka označena jako zpracovává se',
        });

      default:
        return NextResponse.json({ error: 'Neznámá akce' }, { status: 400 });
    }
  } catch (error) {
    console.error('Quick action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chyba při provádění akce' },
      { status: 500 }
    );
  }
}
