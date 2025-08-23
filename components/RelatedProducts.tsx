import Image from "next/image";
import Link from "next/link";
import { createClient } from '@/lib/supabase/server';

interface RelatedProductsProps {
  currentProductId: string;
  limit?: number;
}

interface SimpleProduct {
  id: string;
  slug?: string;
  name: string;
  price: number;
  image_url?: string; // This will be populated by the mapping logic
  status: string;
  product_images?: Array<{ url: string; is_main_image?: boolean }>;
}

// Funkce pro načtení náhodných produktů
async function getRandomProducts(
  currentProductId: string,
  limit: number = 4,
): Promise<SimpleProduct[]> {
  try {
    const supabase = await createClient();
    
    const { data: allProducts } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        price_cents,
        product_images!left(url, is_main)
      `)
      .neq('id', currentProductId)
      .order('id');

    if (!allProducts) return [];

    // Náhodně zamícháme a vybereme požadovaný počet
    const shuffled = allProducts.sort(() => 0.5 - Math.random());

    // Map to SimpleProduct and select the main image
    return shuffled.slice(0, limit).map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price_cents,
      status: 'active',
      image_url:
        p.product_images?.find((img: { is_main?: boolean; url: string }) => img.is_main)?.url || p.product_images?.[0]?.url,
    }));
  } catch (error) {
    console.error("Error loading related products:", error);
    return [];
  }
}

export async function RelatedProducts({ currentProductId, limit = 4 }: RelatedProductsProps) {
  const relatedProducts = await getRandomProducts(currentProductId, limit);

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-16 border-t">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 2xl:px-24">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Mohlo by se vám líbit</h2>
          <p className="text-zinc-600">Objevte další kousky z naší kolekce</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2">
          {relatedProducts.map((product) => {
            const priceFormatted = product.price
              ? `${(product.price / 100).toLocaleString("cs-CZ")} Kč`
              : "Cena na dotaz";

            return (
              <Link
                key={product.id}
                href={product.slug ? `/product/${product.slug}` : "/"}
                className="group block"
              >
                <div className="space-y-3">
                  {/* Product Image */}
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        width={400}
                        height={400}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg
                          className="w-12 h-12"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          role="img"
                          aria-label="Placeholder obrázek"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  </div>

                  {/* Product Info */}
                  <div className="space-y-2 text-center lg:text-left">
                    <h3 className="text-xs font-light tracking-wide uppercase text-zinc-800 group-hover:text-black transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-sm font-medium text-black">{priceFormatted}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Odkaz na všechny produkty */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-black text-white px-6 py-3 text-xs font-medium tracking-wide hover:bg-gray-900 transition-colors uppercase"
          >
            Zobrazit všechny produkty
            <svg
              className="ml-2 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              role="img"
              aria-label="Šipka vpravo"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
