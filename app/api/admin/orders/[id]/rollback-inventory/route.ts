import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { increaseInventory, type CartItemForInventory } from '@/lib/inventory';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // Načteme objednávku
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Objednávka nenalezena' }, { status: 404 });
    }

    // Zkontrolujeme, že objednávka může být rollbackována
    if (order.status === 'cancelled' || order.status === 'refunded') {
      return NextResponse.json({ error: 'Objednávka je již zrušena' }, { status: 400 });
    }

    // Parsujeme položky objednávky
    let inventoryItems: CartItemForInventory[] = [];
    
    try {
      const items = JSON.parse(order.items || '[]');
      inventoryItems = items
        .filter((item: { productId?: string; size?: string }) => item.productId && item.size)
        .map((item: { productId: string; size: string; quantity: number; description?: string; name?: string }) => ({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
          name: item.description || item.name || 'Unknown product'
        }));
    } catch (e) {
      console.error('Failed to parse order items:', e);
      return NextResponse.json({ error: 'Chyba při parsování položek objednávky' }, { status: 500 });
    }

    if (inventoryItems.length === 0) {
      return NextResponse.json({ error: 'Žádné položky k rollbacku' }, { status: 400 });
    }

    // Provedeme rollback inventáře
    const rollbackResult = await increaseInventory(inventoryItems);

    if (!rollbackResult.success) {
      return NextResponse.json({ 
        error: `Rollback selhal: ${rollbackResult.error}` 
      }, { status: 500 });
    }

    // Aktualizujeme status objednávky
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order status:', updateError);
      // Inventář je už rollbacknutý, ale status se neaktualizoval
    }

    return NextResponse.json({
      success: true,
      message: 'Inventář byl úspěšně vrácen',
      updatedItems: rollbackResult.updatedItems
    });

  } catch (error) {
    console.error('Error in inventory rollback:', error);
    return NextResponse.json(
      { error: 'Neočekávaná chyba při rollbacku inventáře' },
      { status: 500 }
    );
  }
}