// src/types/product.ts
export interface ProductImage {
    url: string;
    is_main_image: boolean;
  }
  export interface Sku {
    size: string;
    stock: number;
  }
  export interface Product {
    id: string;
    name: string;
    slug: string;
    price: number;
    product_images?: ProductImage[];
    skus?: Sku[];
  }