// app/page.tsx
import { createClient } from '@/lib/supabase/server';
import ProductGrid from '@/components/ProductGrid';
import ScrollHandler from '@/components/ScrollHandler';

interface HomeProductImage {
  url: string;
  is_main: boolean;
}

interface HomeProduct {
  id: string | number;
  name: string;
  slug: string;
  price_cents: number;
  product_images?: HomeProductImage[];
  skus?: { size: string; stock: number }[];
}

export default async function HomePage() {
  const supabase = await createClient(); // <-- await tady

  const { data } = await supabase
    .from('products')
    .select(
      `
      id,
      name,
      slug,
      price_cents,
      product_images!left(url, is_main),
      skus!left(size, stock)
    `
    )

    .order('id', { ascending: false });

  const products: HomeProduct[] = Array.isArray(data) ? (data as HomeProduct[]) : [];

  // Debug: log first product data
  if (products.length > 0) {
    console.log('Database product debug:', {
      firstProduct: products[0],
      price_cents: products[0].price_cents,
      price_cents_type: typeof products[0].price_cents,
    });
  }

  // Reorder: put non-CD items first so the 4 black items occupy the first row; CDs go to the bottom
  const orderedProducts: HomeProduct[] = products.slice().sort((a: HomeProduct, b: HomeProduct) => {
    const isCD = (p: HomeProduct) => /\bcd\b/i.test(p?.name ?? '');
    return Number(isCD(a)) - Number(isCD(b));
  });

  return (
    <>
      <ScrollHandler />
      <main className="max-w-7xl mx-auto px-2 sm:px-4 pt-[8vh] sm:pt-[6vh] lg:pt-[8vh] pb-[18vh] sm:pb-[24vh] lg:pb-[28vh]">
        <div className="sticky" style={{ top: 'calc(var(--header-height) + 1rem)' }}>
          <ProductGrid products={orderedProducts} />
        </div>

        {/* Contact section - hidden on scroll */}
        <div className="mt-16 text-center contact-section">
          <h2 className="text-lg font-medium text-black mb-4">MÁTE OTÁZKY?</h2>
          <p className="text-sm text-gray-600 mb-2">
            Kontaktujte nás na{' '}
            <a
              href="mailto:info@yeezuz2020.store"
              className="text-black hover:underline font-medium"
            >
              info@yeezuz2020.store
            </a>
          </p>
          <p className="text-xs text-gray-500">Odpovíme vám co nejdříve</p>
        </div>
      </main>
    </>
  );
}
