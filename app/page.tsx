// app/page.tsx
import { createClient } from '@/lib/supabase/server';
import ProductGrid from '@/components/ProductGrid';

export default async function HomePage() {
  const supabase = await createClient();   // <-- await tady

  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      price_cents,
      product_images!left(url, is_main),
      skus!left(size, stock)
    `)

    .order('id', { ascending: false });

  // Debug: log first product data
  if (products && products.length > 0) {
    console.log('Database product debug:', {
      firstProduct: products[0],
      price_cents: products[0].price_cents,
      price_cents_type: typeof products[0].price_cents
    });
  }

  return (
    <main className="max-w-7xl mx-auto px-2 sm:px-4 py-8">
      <div className="text-center mb-8">
        <p className="text-zinc-600 mt-2 text-sm sm:text-base">
          Oficiální e-shop YEEZUZ2020
        </p>
      </div>
      <ProductGrid products={products ?? []} />
    </main>
  );
}