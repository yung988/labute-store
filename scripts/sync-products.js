#!/usr/bin/env node

/**
 * Script pro synchronizaci produktů do Stripe Product Catalog
 * Spusťte příkazem: node scripts/sync-products.js
 */

const Stripe = require('stripe');
require('dotenv').config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

// Produkty z vašeho webu
const PRODUCTS = [
  {
    id: 'labute-ss6-tshirt',
    name: 'Labutě SS6 rhinestone crystal T-shirt',
    description: 'Elegantní tričko s křišťálovými aplikacemi',
    images: ['https://6gtahwcca6a0qxzw.public.blob.vercel-storage.com/products/bb6ec0d2-2490-47d2-b65a-b7e23342db1f/50610e08-496b-486d-aead-ce167a1f9f28.jpg'],
    price_cents: 2500, // 25 CZK
    currency: 'czk',
    metadata: {
      category: 'tshirt',
      brand: 'Labutě'
    }
  },
  {
    id: 'labute-hoodie',
    name: 'Labutě track top Hoodie',
    description: 'Stylová mikina s kapucí',
    images: ['https://6gtahwcca6a0qxzw.public.blob.vercel-storage.com/products/8e29b39d-6c02-4350-a6da-c968a08d9441/c03fa82c-8f3d-4309-bdec-e7c43143f426.jpg'],
    price_cents: 4500, // 45 CZK
    currency: 'czk',
    metadata: {
      category: 'hoodie',
      brand: 'Labutě'
    }
  },
  {
    id: 'labute-polo',
    name: 'Labutě Throwback Polo T-shirt',
    description: 'Klasické polo tričko v retro stylu',
    images: ['https://6gtahwcca6a0qxzw.public.blob.vercel-storage.com/products/878154eb-6022-447f-af0c-3c0fee632203/4f4dae48-47e3-47eb-b501-aed2f572d7f5.jpg'],
    price_cents: 2200, // 22 CZK
    currency: 'czk',
    metadata: {
      category: 'polo',
      brand: 'Labutě'
    }
  },
  {
    id: 'labute-tie',
    name: 'Labutě SS6 rhinestone crystal tie',
    description: 'Elegantní kravata s křišťálovými aplikacemi',
    images: ['https://6gtahwcca6a0qxzw.public.blob.vercel-storage.com/products/da8baee5-ca5c-4895-a598-273f7038e134/e55e3250-eaf3-4db3-8fb2-41feb82f2441.jpg'],
    price_cents: 1800, // 18 CZK
    currency: 'czk',
    metadata: {
      category: 'tie',
      brand: 'Labutě'
    }
  }
];

async function syncProducts() {
  console.log('🚀 Starting Stripe product sync...');

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

// Run the sync
if (require.main === module) {
  syncProducts()
    .then(() => {
      console.log('\n🎉 Sync completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Sync failed:', error);
      process.exit(1);
    });
}

module.exports = { syncProducts, PRODUCTS };