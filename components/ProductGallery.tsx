"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface ProductGalleryProps {
  images: Array<{
    id: string;
    url: string;
    altText?: string;
  }>;
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const openModal = (index: number) => {
    setSelectedImageIndex(index);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setSelectedImageIndex(null);
    document.body.style.overflow = "unset";
  };

  const nextImage = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((selectedImageIndex + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex(selectedImageIndex === 0 ? images.length - 1 : selectedImageIndex - 1);
    }
  };

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-white rounded-lg flex items-center justify-center">
        <span className="text-gray-400">Žádné obrázky</span>
      </div>
    );
  }

  return (
    <>
      {/* Vertical Gallery */}
      <div className="space-y-4">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            className="relative cursor-pointer group w-full text-left"
            onClick={() => openModal(index)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") openModal(index);
            }}
          >
            {/* Změna: odstraněn aspect-square, přidán min-height a flexibilní výška */}
            <div className="relative overflow-hidden rounded-lg bg-white min-h-[400px]">
              <Image
                src={image.url}
                alt={image.altText || `${productName} - obrázek ${index + 1}`}
                width={800}
                height={800}
                className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-105"
                priority={index === 0}
                style={{ minHeight: "400px" }}
              />
            </div>
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-lg flex items-center justify-center">
              <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm font-medium">
                Klikni pro zvětšení
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Modal */}
      {selectedImageIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeModal();
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeModal}
            className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors z-10"
            aria-label="Zavřít"
          >
            <X size={32} />
          </button>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-6 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors text-4xl font-light z-10"
                aria-label="Předchozí obrázek"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors text-4xl font-light z-10"
                aria-label="Následující obrázek"
              >
                ›
              </button>
            </>
          )}

          {/* Main image */}
          <div
            role="img"
            aria-label={
              images[selectedImageIndex].altText ||
              `${productName} - obrázek ${selectedImageIndex + 1}`
            }
            className="relative max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Image
              src={images[selectedImageIndex].url}
              alt={
                images[selectedImageIndex].altText ||
                `${productName} - obrázek ${selectedImageIndex + 1}`
              }
              width={1200}
              height={1200}
              className="max-w-full max-h-[90vh] object-contain"
              priority
            />
          </div>

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm">
              {selectedImageIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
