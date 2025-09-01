'use client';

import { useState } from 'react';
import { type ClothingSize, SizeSelector } from '@/components/ui/size-selector';
import { useCart } from '@/context/CartContext';

interface BuyButtonProps {
  priceId: string;
  isClothing?: boolean;
  productName: string;
  productId: string;
  price: number;
  image?: string;
  variants?: Array<{
    id: string;
    size: string;
    stockQuantity: number;
  }>;
}

export const BuyButton = ({
  priceId,
  isClothing,
  productName,
  productId,
  price,
  image,
  variants,
}: BuyButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedSize, setSelectedSize] = useState<ClothingSize | undefined>(undefined);
  const [sizeError, setSizeError] = useState(false);
  const { addItem } = useCart();

  // Debug: log price data
  console.log('BuyButton price debug:', {
    productId,
    productName,
    price,
    priceType: typeof price,
  });

  const hasMultipleSizes = variants && variants.length > 1;
  const shouldShowSizeSelector = isClothing && hasMultipleSizes;

  const handleSizeChange = (size: ClothingSize) => {
    setSelectedSize(size);
    setSizeError(false);
  };

  const handleAddToCart = () => {
    if (shouldShowSizeSelector && !selectedSize) {
      setSizeError(true);
      return;
    }

    let selectedVariantId: string | undefined;
    let finalSize: string | undefined = selectedSize ?? undefined;

    if (variants && variants.length > 0) {
      if (shouldShowSizeSelector && selectedSize) {
        const selectedVariant = variants.find((v) => v.size === selectedSize);
        selectedVariantId = selectedVariant?.id;
      } else if (!shouldShowSizeSelector) {
        // If size selector is not shown, but variants exist (e.g., one size), pick the first one.
        selectedVariantId = variants[0].id;
        finalSize = variants[0].size;
      }
    } else {
      // If there are no variants at all, use the main product ID.
      selectedVariantId = productId;
      finalSize = undefined;
    }

    if (!selectedVariantId) {
      console.error('Could not determine product variant to add to cart.');
      if (shouldShowSizeSelector) setSizeError(true);
      return;
    }

    setLoading(true);
    addItem({
      variantId: selectedVariantId,
      productId: productId,
      priceId: priceId,
      name: productName,
      price: price,
      quantity: 1,
      image: image,
      size: finalSize,
    });
    setLoading(false);
  };

  return (
    <div>
      {shouldShowSizeSelector && (
        <div className="mb-6">
          <SizeSelector
            onSizeChange={handleSizeChange}
            selectedSize={selectedSize}
            availableSizes={variants?.map((v) => ({
              size: v.size,
              stockQuantity: v.stockQuantity,
            }))}
          />
        </div>
      )}

      {sizeError && (
        <p className="text-red-500 text-sm -mt-2 mb-4">Pro pokračování prosím vyberte velikost</p>
      )}

      <div className="flex flex-col space-y-4">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={loading}
          className="w-full bg-black text-white p-3 text-xs font-medium tracking-wide hover:bg-gray-900 transition-colors disabled:bg-zinc-300 disabled:text-zinc-500 uppercase"
        >
          {loading ? 'Přidávám do košíku...' : 'Přidat do košíku'}
        </button>
      </div>
    </div>
  );
};
