#!/usr/bin/env node

/**
 * Script pro synchronizaci produktů do Stripe Product Catalog
 * Spusťte příkazem: node scripts/sync-products.js
 *
 * Poznámka: Ujistěte se že máte nastavenou proměnnou STRIPE_SECRET_KEY
 * v .env.local nebo jako environment variable
 */

const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');

// Načtení .env.local souboru pokud existuje
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const envLines = envContent.split('\n');

  for (const line of envLines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      // Najít první rovnítko a rozdělit na key a value
      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex > 0) {
        const key = trimmed.substring(0, equalsIndex).trim();
        let value = trimmed.substring(equalsIndex + 1).trim();

        // Odstranit uvozovky na začátku a konci pokud existují
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
  console.error('');
  console.error('💡 Jak nastavit STRIPE_SECRET_KEY:');
  console.error('   1. Jděte na https://dashboard.stripe.com/test/apikeys');
  console.error('   2. Zkopírujte "Secret key" (začíná sk_test_...)');
  console.error('   3. Přidejte do .env.local:');
  console.error('      STRIPE_SECRET_KEY="sk_test_..."');
  console.error('');
  console.error('   Nebo nastavte jako environment variable:');
  console.error('   export STRIPE_SECRET_KEY="sk_test_..."');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

// Funkce pro získání produktů z databáze
async function getProductsFromDatabase() {
  const { createClient } = require('@supabase/supabase-js');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔍 Načítám produkty z databáze...');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, price_cents, skus(id, size, stock)')
    .order('id', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  console.log(`✅ Našel ${products.length} produktů v databázi`);

  return products.map(product => ({
    id: product.id.toLowerCase(),
    name: product.name,
    description: 'Elegantní produkt značky Labutě',
    images: [], // Obrázky přidáme později pokud budou potřeba
    price_cents: Math.round(product.price_cents),
    currency: 'czk',
    metadata: {
      category: product.skus && product.skus.length > 0 ? 'clothing' : 'other',
      brand: 'Labutě',
      slug: product.slug,
      has_variants: (product.skus && product.skus.length > 0).toString()
    }
  }));
}

async function syncProducts() {
  console.log('🚀 Starting Stripe product sync...');

  // Získat produkty z databáze
  const PRODUCTS = await getProductsFromDatabase();

  const results = {
    created: 0,
    updated: 0,
    errors: 0,
    products: []
  };

  for (const product of PRODUCTS) {
    try {
      console.log(`📦 Processing product: ${product.name}`);

      // Check if product already exists
      const existingProducts = await stripe.products.list({
        limit: 100
      });

      const existingProduct = existingProducts.data.find(p =>
        p.metadata?.product_id === product.id
      );

      let stripeProduct;

      if (existingProduct) {
        // Update existing product
        console.log(`🔄 Updating existing product: ${existingProduct.id}`);
        stripeProduct = await stripe.products.update(existingProduct.id, {
          name: product.name,
          description: product.description,
          images: product.images.filter(img => img && img.length > 0),
          metadata: {
            ...product.metadata,
            product_id: product.id
          }
        });
        results.updated++;
      } else {
        // Create new product
        console.log(`✨ Creating new product: ${product.name}`);
        stripeProduct = await stripe.products.create({
          id: product.id,
          name: product.name,
          description: product.description,
          images: product.images.filter(img => img && img.length > 0),
          metadata: {
            ...product.metadata,
            product_id: product.id
          }
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
          currency: product.currency,
          metadata: {
            product_id: product.id
          }
        });
        console.log(`💰 Created price: ${product.price_cents} ${product.currency.toUpperCase()}`);
      }

      results.products.push({
        id: product.id,
        stripeId: stripeProduct.id,
        status: existingProduct ? 'updated' : 'created'
      });

    } catch (error) {
      console.error(`❌ Error processing product ${product.name}:`, error.message);
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

// Zpracování argumentů příkazové řádky
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-d');
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log(`
🔄 Stripe Product Sync Script

Synchronizuje produkty z vašeho webu do Stripe Product Catalog.

Použití:
  node scripts/sync-products.js [options]

Možnosti:
  --dry-run, -d    Zobrazí co by se udělalo, ale neprovede žádné změny
  --help, -h       Zobrazí tuto nápovědu

Příklady:
  node scripts/sync-products.js              # Spustí synchronizaci
  node scripts/sync-products.js --dry-run    # Náhled změn
  node scripts/sync-products.js --help       # Tato nápověda

Produkty které se synchronizují:
${PRODUCTS.map(p => `  • ${p.name} (${p.price_cents / 100} CZK)`).join('\n')}
`);
  process.exit(0);
}

// Run the sync
if (require.main === module) {
  console.log(`🚀 ${isDryRun ? 'DRY RUN' : 'Starting'} Stripe product sync...`);
  console.log(`📦 Processing ${PRODUCTS.length} products\n`);

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - žádné změny nebudou provedeny\n');

    for (const product of PRODUCTS) {
      console.log(`📦 Would process: ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Price: ${product.price_cents / 100} CZK`);
      console.log(`   Category: ${product.metadata.category}`);
      console.log(`   Has variants: ${product.metadata.has_variants}`);
      console.log('');
    }

    console.log('✅ Dry run completed - žádné změny nebyly provedeny');
    process.exit(0);
  }

  syncProducts()
    .then((results) => {
      console.log('\n🎉 Sync completed successfully!');
      console.log(`📊 Summary: ${results.created} created, ${results.updated} updated, ${results.errors} errors`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Sync failed:', error.message);
      console.error('\n🔧 Troubleshooting:');
      console.error('   1. Zkontrolujte STRIPE_SECRET_KEY v .env.local');
      console.error('   2. Ověřte připojení k internetu');
      console.error('   3. Zkontrolujte Stripe dashboard pro API stav');
      process.exit(1);
    });
}

module.exports = { syncProducts, PRODUCTS };