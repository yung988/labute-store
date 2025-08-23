"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Product } from "@/types/products";

type ProductWithStock = Product & {
  total_stock: number;
  low_stock_threshold: number;
};

export default function InventoryTable() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/inventory");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setProducts(json.products);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStock = async (productId: string, size: string, newStock: number) => {
    try {
      const res = await fetch(`/api/admin/inventory/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size, stock: newStock }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      await load(); // Reload data
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 border">Product</th>
              <th className="p-2 border">Slug</th>
              <th className="p-2 border">Price</th>
              <th className="p-2 border">Size</th>
              <th className="p-2 border">Stock</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) =>
              product.skus?.map((sku) => (
                <tr key={`${product.id}-${sku.size}`} className="odd:bg-background even:bg-muted/30">
                  <td className="p-2 border align-top">{product.name}</td>
                  <td className="p-2 border align-top">{product.slug}</td>
                  <td className="p-2 border align-top">{product.price} CZK</td>
                  <td className="p-2 border align-top">{sku.size}</td>
                  <td className="p-2 border align-top">
                    <Input
                      type="number"
                      value={sku.stock}
                      onChange={(e) => {
                        const newStock = parseInt(e.target.value) || 0;
                        updateStock(product.id, sku.size, newStock);
                      }}
                      className="w-20"
                      min="0"
                    />
                  </td>
                  <td className="p-2 border align-top">
                    <span className={`px-2 py-1 rounded text-xs ${
                      sku.stock === 0 
                        ? 'bg-red-100 text-red-800' 
                        : sku.stock < 5 
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {sku.stock === 0 ? 'Out of Stock' : sku.stock < 5 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td className="p-2 border align-top">
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateStock(product.id, sku.size, sku.stock + 1)}
                      >
                        +1
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateStock(product.id, sku.size, Math.max(0, sku.stock - 1))}
                      >
                        -1
                      </Button>
                    </div>
                  </td>
                </tr>
              )) || (
                <tr key={product.id}>
                  <td colSpan={7} className="p-2 border text-center text-muted-foreground">
                    No SKUs defined
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
      
      {products.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No products found
        </div>
      )}
    </div>
  );
}