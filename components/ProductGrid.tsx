// components/ProductGrid.tsx
import Image from 'next/image';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  product_images?: { url: string; is_main: boolean }[];
}

export default function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {products.map((p) => (
        <Link key={p.id} href={`/product/${p.slug}`} className="group">
          <div className="aspect-square bg-white relative overflow-hidden flex items-center justify-center border border-black">
            <Image
              src={
                p.product_images?.find((img) => img.is_main)?.url ||
                p.product_images?.[0]?.url ||
                '/placeholder.jpg'
              }
              alt={p.name}
              width={400}
              height={400}
              className="object-contain w-full h-full group-hover:scale-105 transition-transform"
            />
          </div>
          <div className="mt-1 px-1">
            <h3 className="text-xs sm:text-sm font-medium leading-tight mb-0.5">{p.name}</h3>
            <p className="text-xs sm:text-sm font-bold">
              {Number(p.price_cents / 100).toLocaleString('cs-CZ')} Kč
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}