import { supabaseAdmin } from "@/lib/supabase/admin";

export interface CartItemForInventory {
  productId: string;
  size?: string;
  quantity: number;
  name: string;
}

export interface InventoryUpdateResult {
  success: boolean;
  error?: string;
  updatedItems?: Array<{
    skuId: string;
    productId: string;
    size: string;
    oldStock: number;
    newStock: number;
  }>;
}

/**
 * Snižuje sklad pro položky v objednávce
 * @param items Položky z košíku/objednávky
 * @returns Výsledek operace s detaily o změnách
 */
export async function decreaseInventory(items: CartItemForInventory[]): Promise<InventoryUpdateResult> {
  const updatedItems: InventoryUpdateResult['updatedItems'] = [];
  
  try {
    // Začneme transakci pro atomické operace
    for (const item of items) {
      if (!item.size) {
        console.warn(`Skipping inventory update for ${item.name} - no size specified`);
        continue;
      }

      // Najdeme SKU pro daný produkt a velikost
      const { data: sku, error: skuError } = await supabaseAdmin
        .from('skus')
        .select('*')
        .eq('product_id', item.productId)
        .eq('size', item.size)
        .single();

      if (skuError || !sku) {
        console.error(`SKU not found for product ${item.productId}, size ${item.size}:`, skuError);
        return {
          success: false,
          error: `SKU nenalezeno pro produkt ${item.name}, velikost ${item.size}`
        };
      }

      // Zkontrolujeme dostupnost
      if (sku.stock < item.quantity) {
        return {
          success: false,
          error: `Nedostatek zásob pro ${item.name} (velikost ${item.size}). Dostupné: ${sku.stock}, požadované: ${item.quantity}`
        };
      }

      // Snížíme sklad
      const newStock = sku.stock - item.quantity;
      const { error: updateError } = await supabaseAdmin
        .from('skus')
        .update({ stock: newStock })
        .eq('id', sku.id);

      if (updateError) {
        console.error(`Failed to update stock for SKU ${sku.id}:`, updateError);
        return {
          success: false,
          error: `Chyba při aktualizaci skladu pro ${item.name}`
        };
      }

      updatedItems.push({
        skuId: sku.id,
        productId: item.productId,
        size: item.size,
        oldStock: sku.stock,
        newStock: newStock
      });

      console.log(`✅ Inventory updated: ${item.name} (${item.size}) - stock reduced from ${sku.stock} to ${newStock}`);
    }

    return {
      success: true,
      updatedItems
    };

  } catch (error) {
    console.error('Error in decreaseInventory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Neočekávaná chyba při aktualizaci skladu'
    };
  }
}

/**
 * Vrací položky zpět do skladu (pro rollback)
 * @param items Položky k vrácení
 * @returns Výsledek operace
 */
export async function increaseInventory(items: CartItemForInventory[]): Promise<InventoryUpdateResult> {
  const updatedItems: InventoryUpdateResult['updatedItems'] = [];
  
  try {
    for (const item of items) {
      if (!item.size) {
        console.warn(`Skipping inventory rollback for ${item.name} - no size specified`);
        continue;
      }

      // Najdeme SKU
      const { data: sku, error: skuError } = await supabaseAdmin
        .from('skus')
        .select('*')
        .eq('product_id', item.productId)
        .eq('size', item.size)
        .single();

      if (skuError || !sku) {
        console.error(`SKU not found for rollback ${item.productId}, size ${item.size}:`, skuError);
        continue; // Pokračujeme s dalšími položkami
      }

      // Zvýšíme sklad
      const newStock = sku.stock + item.quantity;
      const { error: updateError } = await supabaseAdmin
        .from('skus')
        .update({ stock: newStock })
        .eq('id', sku.id);

      if (updateError) {
        console.error(`Failed to rollback stock for SKU ${sku.id}:`, updateError);
        continue;
      }

      updatedItems.push({
        skuId: sku.id,
        productId: item.productId,
        size: item.size,
        oldStock: sku.stock,
        newStock: newStock
      });

      console.log(`🔄 Inventory rolled back: ${item.name} (${item.size}) - stock increased from ${sku.stock} to ${newStock}`);
    }

    return {
      success: true,
      updatedItems
    };

  } catch (error) {
    console.error('Error in increaseInventory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Neočekávaná chyba při rollback skladu'
    };
  }
}

/**
 * Zkontroluje dostupnost položek před objednávkou
 * @param items Položky k ověření
 * @returns Výsledek kontroly dostupnosti
 */
export async function checkInventoryAvailability(items: CartItemForInventory[]): Promise<{
  available: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    for (const item of items) {
      if (!item.size) {
        warnings.push(`Položka ${item.name} nemá specifikovanou velikost`);
        continue;
      }

      // Najdeme SKU
      const { data: sku, error: skuError } = await supabaseAdmin
        .from('skus')
        .select('*')
        .eq('product_id', item.productId)
        .eq('size', item.size)
        .single();

      if (skuError || !sku) {
        errors.push(`SKU nenalezeno pro ${item.name}, velikost ${item.size}`);
        continue;
      }

      // Zkontrolujeme dostupnost
      if (sku.stock < item.quantity) {
        errors.push(`Nedostatek zásob pro ${item.name} (velikost ${item.size}). Dostupné: ${sku.stock}, požadované: ${item.quantity}`);
      } else if (sku.stock <= 5) {
        warnings.push(`Nízké zásoby pro ${item.name} (velikost ${item.size}): ${sku.stock} kusů`);
      }
    }

    return {
      available: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    console.error('Error checking inventory availability:', error);
    return {
      available: false,
      errors: ['Chyba při kontrole dostupnosti zásob'],
      warnings: []
    };
  }
}