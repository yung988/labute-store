import Stripe from 'stripe';
import { getProductImage } from '@/lib/product-images';
import type { ProductData } from './types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Function to get products from database
async function getProductsFromDatabase(): Promise<ProductData[]> {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, price_cents, skus(id, size, stock)')
    .order('id', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return products.map(product => ({
    id: product.id.toLowerCase(),
    name: product.name,
    description: `Elegantní produkt značky Labutě`,
    images: [getProductImage(product.name) || ''],
    price_cents: Math.round(product.price_cents), // Ensure integer
    currency: 'czk',
    metadata: {
      category: product.skus && product.skus.length > 0 ? 'clothing' : 'other',
      brand: 'Labutě',
      slug: product.slug,
      has_variants: (product.skus && product.skus.length > 0).toString()
    }
  }));
}

export async function syncProductsToStripe() {
  console.log('🚀 Starting Stripe product sync...');

  // Get products from database
  const PRODUCTS = await getProductsFromDatabase();
  console.log(`📦 Found ${PRODUCTS.length} products in database`);

  const results = {
    created: 0,
    updated: 0,
    errors: 0,
    products: [] as Array<{ id: string; stripeId: string; status: string }>
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

      let stripeProduct: Stripe.Product;

      if (existingProduct) {
        // Update existing product
        console.log(`🔄 Updating existing product: ${existingProduct.id}`);
        stripeProduct = await stripe.products.update(existingProduct.id, {
          name: product.name,
          description: product.description,
          images: product.images.filter(img => img.length > 0),
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
          images: product.images.filter(img => img.length > 0),
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
      console.error(`❌ Error processing product ${product.name}:`, error);
      results.errors++;
      results.products.push({
        id: product.id,
        stripeId: '',
        status: 'error'
      });
    }
  }

  console.log('✅ Stripe product sync completed!');
  console.log(`📊 Results: ${results.created} created, ${results.updated} updated, ${results.errors} errors`);

  return results;
}

export async function getStripeProducts() {
  const products = await stripe.products.list({
    limit: 100,
    expand: ['data.default_price']
  });

  return products.data.map(product => ({
    id: product.id,
    name: product.name,
    description: product.description,
    images: product.images,
    active: product.active,
    metadata: product.metadata,
    default_price: product.default_price
  }));
}

export async function createCheckoutSession(productIds: string[], successUrl: string, cancelUrl: string) {
  const lineItems = await Promise.all(
    productIds.map(async (productId) => {
      const product = PRODUCTS.find(p => p.id === productId);
      if (!product) throw new Error(`Product ${productId} not found`);

      // Get the active price for this product
      const prices = await stripe.prices.list({
        product: productId,
        active: true,
        limit: 1
      });

      if (prices.data.length === 0) {
        throw new Error(`No active price found for product ${productId}`);
      }

      return {
        price: prices.data[0].id,
        quantity: 1
      };
    })
  );

  const session = await stripe.checkout.sessions.create({
    line_items: lineItems,
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    shipping_address_collection: {
      allowed_countries: ['CZ']
    },
    custom_fields: [
      {
        key: 'pickup_point_id',
        label: {
          type: 'custom',
          custom: 'Packeta Point ID (volitelné)'
        },
        type: 'text',
        optional: true
      }
    ]
  });

  return session;
}