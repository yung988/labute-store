// Product image mapping based on product names from Stripe
const PRODUCT_IMAGES: Record<string, string> = {
  // T-shirt
  "Labutě SS6 rhinestone crystal T-shirt": "https://6gtahwcca6a0qxzw.public.blob.vercel-storage.com/products/bb6ec0d2-2490-47d2-b65a-b7e23342db1f/50610e08-496b-486d-aead-ce167a1f9f28.jpg",
  
  // Hoodie  
  "Labutě track top Hoodie": "https://6gtahwcca6a0qxzw.public.blob.vercel-storage.com/products/8e29b39d-6c02-4350-a6da-c968a08d9441/c03fa82c-8f3d-4309-bdec-e7c43143f426.jpg",
  
  // Polo
  "Labutě Throwback Polo T-shirt": "https://6gtahwcca6a0qxzw.public.blob.vercel-storage.com/products/878154eb-6022-447f-af0c-3c0fee632203/4f4dae48-47e3-47eb-b501-aed2f572d7f5.jpg",
  
  // Tie
  "Labutě SS6 rhinestone crystal tie": "https://6gtahwcca6a0qxzw.public.blob.vercel-storage.com/products/da8baee5-ca5c-4895-a598-273f7038e134/e55e3250-eaf3-4db3-8fb2-41feb82f2441.jpg"
};

export function getProductImage(productName: string): string | undefined {
  // Direct match first
  if (PRODUCT_IMAGES[productName]) {
    return PRODUCT_IMAGES[productName];
  }
  
  // Fuzzy match for partial names
  const lowerName = productName.toLowerCase();
  for (const [key, image] of Object.entries(PRODUCT_IMAGES)) {
    if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {
      return image;
    }
  }
  
  return undefined;
}

// Format order ID for display
export function formatOrderId(orderId: string): string {
  // Take last 8 characters and format as #XXXXXXXX
  return `#${orderId.slice(-8).toUpperCase()}`;
}

// Get numeric order ID for simpler display
export function getOrderNumber(orderId: string): string {
  // Create a simple hash from UUID to get a number
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    const char = orderId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Get a positive 4-digit number
  const number = Math.abs(hash) % 9999 + 1;
  return number.toString().padStart(4, '0');
}