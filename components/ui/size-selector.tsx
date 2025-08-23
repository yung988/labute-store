"use client";

// import { useState } from "react";

export type ClothingSize = string;

interface SizeSelectorProps {
  onSizeChange: (size: ClothingSize) => void;
  selectedSize?: ClothingSize;
  availableSizes?: Array<{
    size: string;
    stockQuantity: number;
  }>;
}

export function SizeSelector({ onSizeChange, selectedSize, availableSizes }: SizeSelectorProps) {
  const defaultSizes = ["S", "M", "L", "XL", "XXL"];
  const sizes = availableSizes?.map((v) => v.size) || defaultSizes;

  const handleSizeChange = (size: ClothingSize) => {
    onSizeChange(size);
  };

  return (
    <div className="mb-6">
      <div className="text-sm mb-2 text-zinc-600">VYBERTE VELIKOST</div>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const variant = availableSizes?.find((v) => v.size === size);
          const isOutOfStock = variant ? variant.stockQuantity === 0 : false;

          return (
            <button
              key={size}
              type="button"
              onClick={() => !isOutOfStock && handleSizeChange(size)}
              disabled={isOutOfStock}
              className={`w-12 h-12 flex items-center justify-center border ${
                selectedSize === size
                  ? "border-black bg-black text-white"
                  : isOutOfStock
                    ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "border-gray-300 hover:border-black"
              }`}
              aria-label={`Velikost ${size}${isOutOfStock ? " - vyprodáno" : ""}`}
              tabIndex={isOutOfStock ? -1 : 0}
              onKeyDown={(e) => {
                if (!isOutOfStock && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleSizeChange(size);
                }
              }}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
}
