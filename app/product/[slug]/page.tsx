import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyButton } from "@/components/BuyButton";
import { ProductGallery } from "@/components/ProductGallery";
import { RelatedProducts } from "@/components/RelatedProducts";
import { createClient } from '@/lib/supabase/server';

// Force this page to be dynamic to avoid build-time execution of cookies() in Supabase client
export const dynamic = 'force-dynamic';

// Interface for transformed product data used by components
interface TransformedProduct {
  id: string;
  name: string;
  description: string;
  images: {
    id: string;
    url: string;
    altText?: string;
  }[];
  price: string;
  priceAmount: number;
  priceId: string;
  isClothing: boolean;
  priceInCents: number;
  variants: {
    id: string;
    size: string;
    stockQuantity: number;
  }[];
}

// Funkce pro načtení produktu z API
async function getProduct(slug: string): Promise<TransformedProduct | null> {
  try {
    const supabase = await createClient();

    const { data: productWithDetails } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        description,
        price_cents,
        product_images!left(id, url, is_main),
        skus!left(id, size, stock)
      `)
      .eq('slug', slug)
      .single();

    if (!productWithDetails) {
      return null;
    }

    // Seřadíme obrázky - hlavní obrázek první
    const sortedImages = productWithDetails.product_images?.sort(
      (a: { is_main?: boolean }, b: { is_main?: boolean }) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0)
    ) || [];

    // Zjistíme, zda má produkt varianty velikostí (oblečení)
    const isClothing = productWithDetails.skus && productWithDetails.skus.length > 0;

    const amount = Number(productWithDetails.price_cents) / 100 || 0;
    const priceFormatted = amount
      ? `${amount.toLocaleString("cs-CZ")} Kč`
      : "Cena není k dispozici";

    // Debug: log raw price data
    console.log('Product price debug:', {
      id: productWithDetails.id,
      name: productWithDetails.name,
      price_cents: productWithDetails.price_cents,
      price_cents_type: typeof productWithDetails.price_cents,
      amount: amount,
      amount_type: typeof amount,
      priceFormatted: priceFormatted,
      priceAmount: amount
    });

    return {
      id: productWithDetails.id,
      name: productWithDetails.name,
      description: productWithDetails.description ?? "",
      images: sortedImages.map((img: { id: string; url: string }) => ({
        id: img.id,
        url: img.url,
        altText: productWithDetails.name,
      })),
      price: priceFormatted,
      priceAmount: amount,
      priceId: "", // pro stripe
      isClothing,
      priceInCents: productWithDetails.price_cents,
      variants: productWithDetails.skus?.map((variant: { id: string; size: string }) => ({
        id: variant.id,
        size: variant.size,
        stockQuantity: 10, // Default stock value
      })) || [],
    };
  } catch (error) {
    console.error("Error loading product:", error);
    return null;
  }
}

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="relative">
      {/* Sticky navigation na levé straně */}
      <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-10 hidden lg:block">
        <div className="bg-white shadow-lg rounded-full p-3 border">
          <Link
            href="/"
            className="flex items-center justify-center w-12 h-12 text-zinc-600 hover:text-black hover:bg-gray-50 rounded-full transition-all duration-200 group"
            title="Zpět do obchodu"
          >
            <svg
              className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              role="img"
              aria-label="Zpět"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 2xl:px-24 max-w-[1400px] pt-[8vh] pb-12">
        {/* Mobile navigation - high fashion style */}
        <nav className="mb-16 lg:hidden text-center">
          <Link href="/" className="inline-block group">
            <div className="text-xs font-medium tracking-[0.2em] uppercase text-gray-600 group-hover:text-gray-900 transition-colors duration-300 mb-2">
              ← ZPĚT DO OBCHODU
            </div>
            <div className="w-16 h-px bg-gray-300 group-hover:bg-gray-900 transition-colors duration-300 mx-auto"></div>
          </Link>
        </nav>

        {/* Main content - High Fashion Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Levý sloupec - Image Gallery */}
          <div>
            <ProductGallery images={product.images} productName={product.name} />
          </div>

          {/* Pravý sloupec - Product info (sticky) */}
          <div
            className="lg:sticky lg:self-start lg:-mt-[6vh]"
            style={{ top: 'calc(var(--header-height) + 2vh)' }}
          >
            {/* Product header */}
            <div className="text-center lg:text-left space-y-8">
              <div>
                <h1 className="text-2xl lg:text-3xl font-light tracking-[0.1em] uppercase text-gray-900 mb-6">
                  {product.name}
                </h1>
                <div className="text-lg font-light tracking-wide text-gray-900 mb-8">
                  {product.price}
                </div>
              </div>

              {product.description && (
                <div className="border-t border-gray-200 pt-8">
                  <p className="text-sm leading-relaxed text-gray-700 font-light tracking-wide max-w-md mx-auto lg:mx-0">
                    {product.description}
                  </p>
                </div>
              )}
            </div>

            {/* Buy section */}
            <div className="border-t border-gray-200 mt-12 pt-12">
              <div className="space-y-8">
                <BuyButton
                  priceId={product.priceId}
                  isClothing={product.isClothing}
                  productName={product.name}
                  productId={product.id}
                  price={product.priceAmount}
                  image={product.images?.[0]?.url || "/placeholder.jpg"}
                  variants={product.variants}
                />

                <div className="text-center lg:text-left">
                  <div className="space-y-3 text-xs tracking-wide text-gray-600 font-light">
                    <p className="flex items-center justify-center lg:justify-start">
                      <span className="w-1 h-1 bg-gray-400 rounded-full mr-3"></span>
                      SKLADEM A ODESÍLÁME DO 3–5 PRACOVNÍCH DNŮ
                    </p>
                    <p className="flex items-center justify-center lg:justify-start">
                      <span className="w-1 h-1 bg-gray-400 rounded-full mr-3"></span>
                      OMEZENÉ MNOŽSTVÍ KUSŮ NA OSOBU
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      <RelatedProducts currentProductId={product.id} limit={4} />
    </div>
  );
}
