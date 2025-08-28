#!/usr/bin/env node

/**
 * Nový skript pro synchronizaci produktů z Supabase do Stripe s variantami a obrázky
 * Spusťte příkazem: pnpm tsx scripts/sync-products-new.ts
 *
 * Funkce:
 * - Načítá produkty z Supabase včetně variant (skus) a obrázků
 * - Produkty s variantami vytváří jako samostatné produkty v Stripe
 * - Přidává obrázky k produktům
 * - Synchronizuje ceny v CZK
 *
 * Poznámka: Ujistěte se že máte nastavené proměnné:
 * - STRIPE_SECRET_KEY
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Načtení .env.local souboru pokud existuje
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const envLines = envContent.split('\n');

  for (const line of envLines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex > 0) {
        const key = trimmed.substring(0, equalsIndex).trim();
        let value = trimmed.substring(equalsIndex + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        process.env[key] = value;
      }
    }
  }
  console.log('✅ Načten .env.local soubor');
}

// Kontrola povinných environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Chyba: STRIPE_SECRET_KEY není nastavena!');
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Chyba: Supabase proměnné nejsou nastavené!');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Interface pro produkt z databáze
interface DatabaseProduct {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  category: string;
  slug: string;
  weight_g: number;
  weight_kg: number;
  skus: Sku[];
  images: ProductImage[];
}

interface Sku {
  id: string;
  product_id: string;
  size: string;
  stock: number;
}

interface ProductImage {
  id: number;
  product_id: string;
  url: string;
  alt_text: string | null;
  is_main: boolean;
  sort_order: number;
}

// Interface pro synchronizovaný produkt
interface SyncProduct {
  id: string;
  name: string;
  description: string;
  images: string[];
  price_cents: number;
  currency: string;
  metadata: Record<string, string>;
  variants?: SyncVariant[];
}

interface SyncVariant {
  id: string;
  size: string;
  stock: number;
  price_cents: number;
}

// Funkce pro získání produktů z databáze s variantami a obrázky
async function getProductsFromDatabase(): Promise<DatabaseProduct[]> {
  console.log('🔍 Načítám produkty z databáze...');

  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      skus(id, product_id, size, stock),
      product_images(id, product_id, url, alt_text, is_main, sort_order)
    `)
    .order('id', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  console.log(`✅ Našel ${products.length} produktů v databázi`);

  // Log produktů s počtem variant a obrázků
  products.forEach(product => {
    const variantCount = product.skus?.length || 0;
    const imageCount = product.product_images?.length || 0;
    console.log(`  • ${product.name} (${product.price_cents / 100} CZK) - ${variantCount} variant, ${imageCount} obrázků`);
  });

  return products;
}

// Funkce pro získání obrázků pro produkt
function getProductImages(product: DatabaseProduct): string[] {
  if (!product.product_images || product.product_images.length === 0) {
    return [];
  }

  // Seřadit obrázky podle sort_order a dát hlavní obrázek první
  const sortedImages = product.product_images.sort((a, b) => {
    if (a.is_main) return -1;
    if (b.is_main) return 1;
    return a.sort_order - b.sort_order;
  });

  return sortedImages.map(img => img.url);
}

// Funkce pro synchronizaci produktů do Stripe
async function syncProductsToStripe(products: DatabaseProduct[]) {
  console.log('\n🚀 Starting Stripe product sync...');

  const results = {
    created: 0,
    updated: 0,
    errors: 0,
    products: [] as Array<{ id: string; stripeId: string; status: string; variants?: number }>
  };

  for (const product of products) {
    try {
      console.log(`\n📦 Processing product: ${product.name}`);

      const productImages = getProductImages(product);
      console.log(`🖼️  Found ${productImages.length} images`);

      // Pokud produkt má varianty, vytvoříme samostatné produkty pro každou variantu
      if (product.skus && product.skus.length > 0) {
        console.log(`👕 Processing ${product.skus.length} variants`);

        for (const sku of product.skus) {
          const variantId = `${product.id}-${sku.size}`.toLowerCase();
          const variantName = `${product.name} - ${sku.size}`;

          // Check if variant already exists
          const existingProducts = await stripe.products.list({
            limit: 100
          });

          const existingVariant = existingProducts.data.find(p =>
            p.metadata?.product_id === product.id.toLowerCase() &&
            p.metadata?.size === sku.size
          );

          let stripeProduct: Stripe.Product;

          const variantData = {
            name: variantName,
            description: product.description || 'Elegantní produkt značky Labutě',
            images: productImages,
            metadata: {
              product_id: product.id.toLowerCase(),
              variant_id: sku.id,
              size: sku.size,
              stock: sku.stock.toString(),
              category: product.category,
              brand: 'Labutě',
              slug: product.slug,
              weight_kg: product.weight_kg.toString(),
              parent_product: product.name
            }
          };

          if (existingVariant) {
            // Update existing variant
            console.log(`🔄 Updating variant: ${variantName}`);
            stripeProduct = await stripe.products.update(existingVariant.id, variantData);
            results.updated++;
          } else {
            // Create new variant
            console.log(`✨ Creating variant: ${variantName}`);
            stripeProduct = await stripe.products.create({
              id: variantId,
              ...variantData
            });
            results.created++;
          }

          // Create or update price for variant
          const prices = await stripe.prices.list({
            product: stripeProduct.id,
            limit: 10
          });

          const activePrice = prices.data.find(p => p.active);

          if (!activePrice || activePrice.unit_amount !== product.price_cents) {
            // Deactivate old price if exists
            if (activePrice) {
              await stripe.prices.update(activePrice.id, { active: false });
            }

            // Create new price
            await stripe.prices.create({
              product: stripeProduct.id,
              unit_amount: product.price_cents,
              currency: 'czk',
              metadata: {
                product_id: product.id.toLowerCase(),
                variant_id: sku.id,
                size: sku.size
              }
            });
            console.log(`💰 Created price for ${sku.size}: ${product.price_cents / 100} CZK`);
          }
        }

        results.products.push({
          id: product.id,
          stripeId: `multiple-variants`,
          status: 'variants-processed',
          variants: product.skus.length
        });

      } else {
        // Produkt bez variant - vytvoříme jeden produkt
        const productId = product.id.toLowerCase();

        // Check if product already exists
        const existingProducts = await stripe.products.list({
          limit: 100
        });

        const existingProduct = existingProducts.data.find(p =>
          p.metadata?.product_id === productId
        );

        let stripeProduct: Stripe.Product;

        const productData = {
          name: product.name,
          description: product.description || 'Elegantní produkt značky Labutě',
          images: productImages,
          metadata: {
            product_id: productId,
            category: product.category,
            brand: 'Labutě',
            slug: product.slug,
            weight_kg: product.weight_kg.toString(),
            has_variants: 'false'
          }
        };

        if (existingProduct) {
          // Update existing product
          console.log(`🔄 Updating product: ${product.name}`);
          stripeProduct = await stripe.products.update(existingProduct.id, productData);
          results.updated++;
        } else {
          // Create new product
          console.log(`✨ Creating product: ${product.name}`);
          stripeProduct = await stripe.products.create({
            id: productId,
            ...productData
          });
          results.created++;
        }

        // Create or update price
        const prices = await stripe.prices.list({
          product: stripeProduct.id,
          limit: 10
        });

        const activePrice = prices.data.find(p => p.active);

        if (!activePrice || activePrice.unit_amount !== product.price_cents) {
          // Deactivate old price if exists
          if (activePrice) {
            await stripe.prices.update(activePrice.id, { active: false });
          }

          // Create new price
          await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: product.price_cents,
            currency: 'czk',
            metadata: {
              product_id: productId
            }
          });
          console.log(`💰 Created price: ${product.price_cents / 100} CZK`);
        }

        results.products.push({
          id: product.id,
          stripeId: stripeProduct.id,
          status: existingProduct ? 'updated' : 'created'
        });
      }

    } catch (error) {
      console.error(`❌ Error processing product ${product.name}:`, error);
      results.errors++;
      results.products.push({
        id: product.id,
        stripeId: '',
        status: 'error'
      });
    }
  }

  console.log('\n✅ Stripe product sync completed!');
  console.log(`📊 Results: ${results.created} created, ${results.updated} updated, ${results.errors} errors`);

  return results;
}

// Hlavní funkce
async function main() {
  try {
    // Zpracování argumentů příkazové řádky
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run') || args.includes('-d');
    const showHelp = args.includes('--help') || args.includes('-h');

    if (showHelp) {
      console.log(`
🔄 Nový Stripe Product Sync Script s variantami a obrázky

Synchronizuje produkty z Supabase databáze do Stripe Product Catalog.
Zpracovává varianty (velikosti) jako samostatné produkty a přidává obrázky.

Použití:
  pnpm tsx scripts/sync-products-new.ts [options]

Možnosti:
  --dry-run, -d    Zobrazí co by se udělalo, ale neprovede žádné změny
  --help, -h       Zobrazí tuto nápovědu

Příklady:
  pnpm tsx scripts/sync-products-new.ts              # Spustí synchronizaci
  pnpm tsx scripts/sync-products-new.ts --dry-run    # Náhled změn
  pnpm tsx scripts/sync-products-new.ts --help       # Tato nápověda
      `);
      process.exit(0);
    }

    // Načtení produktů z databáze
    const products = await getProductsFromDatabase();

    if (isDryRun) {
      console.log('\n🔍 DRY RUN MODE - žádné změny nebudou provedeny\n');

      for (const product of products) {
        const variantCount = product.skus?.length || 0;
        const imageCount = product.product_images?.length || 0;
        const productImages = getProductImages(product);

        console.log(`📦 Would process: ${product.name}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   Price: ${product.price_cents / 100} CZK`);
        console.log(`   Category: ${product.category}`);
        console.log(`   Weight: ${product.weight_kg} kg`);
        console.log(`   Variants: ${variantCount} (velikosti: ${product.skus?.map(s => s.size).join(', ') || 'žádné'})`);
        console.log(`   Images: ${imageCount} (${productImages.length > 0 ? '✓ obrázky nalezeny' : '✗ žádné obrázky'})`);
        console.log('');
      }

      console.log('✅ Dry run completed - žádné změny nebyly provedeny');
      return;
    }

    // Synchronizace do Stripe
    const results = await syncProductsToStripe(products);

    console.log('\n🎉 Sync completed successfully!');
    console.log(`📊 Summary: ${results.created} created, ${results.updated} updated, ${results.errors} errors`);

    // Zobrazit detaily o zpracovaných produktech
    console.log('\n📋 Processed products:');
    results.products.forEach(p => {
      if (p.variants) {
        console.log(`   • ${p.id}: ${p.variants} variants processed`);
      } else {
        console.log(`   • ${p.id}: ${p.status} (${p.stripeId})`);
      }
    });

  } catch (error) {
    console.error('\n💥 Sync failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Zkontrolujte STRIPE_SECRET_KEY v .env.local');
    console.error('   2. Zkontrolujte Supabase proměnné');
    console.error('   3. Ověřte připojení k internetu');
    console.error('   4. Zkontrolujte Stripe dashboard pro API stav');
    process.exit(1);
  }
}

    // Načtení produktů z databáze
    const products = await getProductsFromDatabase();

    if (isDryRun) {
      console.log('\n🔍 DRY RUN MODE - žádné změny nebudou provedeny\n');

      for (const product of products) {
        console.log(`📦 Would process: ${product.name}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   Price: ${product.price_cents / 100} CZK`);
        console.log(`   Category: ${product.category}`);
        console.log(`   Weight: ${product.weight_kg} kg`);
        console.log('');
      }

      console.log('✅ Dry run completed - žádné změny nebyly provedeny');
      return;
    }

    // Synchronizace do Stripe
    const results = await syncProductsToStripe(products);

    console.log('\n🎉 Sync completed successfully!');
    console.log(`📊 Summary: ${results.created} created, ${results.updated} updated, ${results.errors} errors`);

  } catch (error) {
    console.error('\n💥 Sync failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Zkontrolujte STRIPE_SECRET_KEY v .env.local');
    console.error('   2. Zkontrolujte Supabase proměnné');
    console.error('   3. Ověřte připojení k internetu');
    console.error('   4. Zkontrolujte Stripe dashboard pro API stav');
    process.exit(1);
  }
}

// Spuštění skriptu
if (require.main === module) {
  main();
}