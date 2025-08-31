"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, TrendingDown, RefreshCw } from "lucide-react";
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

  // Calculate alerts
  const lowStockItems = products.flatMap(product => 
    product.skus?.filter(sku => sku.stock <= 5 && sku.stock > 0).map(sku => ({
      ...sku,
      productName: product.name,
      productId: product.id
    })) || []
  );

  const outOfStockItems = products.flatMap(product => 
    product.skus?.filter(sku => sku.stock === 0).map(sku => ({
      ...sku,
      productName: product.name,
      productId: product.id
    })) || []
  );

  const totalProducts = products.length;
  const totalVariants = products.reduce((sum, p) => sum + (p.skus?.length || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Správa skladem</h2>
          <p className="text-muted-foreground">
            {totalProducts} produktů, {totalVariants} variant
          </p>
        </div>
        <Button onClick={load} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Obnovit
        </Button>
      </div>

      {/* Alerts */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {outOfStockItems.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Vyprodané položky
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-900 mb-2">
                  {outOfStockItems.length}
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {outOfStockItems.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="text-sm text-red-700">
                      {item.productName} - {item.size}
                    </div>
                  ))}
                  {outOfStockItems.length > 5 && (
                    <div className="text-sm text-red-600">
                      ... a {outOfStockItems.length - 5} dalších
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {lowStockItems.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-orange-800 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  Nízké zásoby
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900 mb-2">
                  {lowStockItems.length}
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {lowStockItems.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="text-sm text-orange-700 flex justify-between">
                      <span>{item.productName} - {item.size}</span>
                      <Badge variant="outline" className="text-orange-800 border-orange-300">
                        {item.stock} ks
                      </Badge>
                    </div>
                  ))}
                  {lowStockItems.length > 5 && (
                    <div className="text-sm text-orange-600">
                      ... a {lowStockItems.length - 5} dalších
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Inventory table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Skladové zásoby
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  <td className="p-2 border align-top">{(product.price_cents / 100).toFixed(2)} CZK</td>
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
        
        {products.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No products found
          </div>
        )}
      </div>
        </CardContent>
      </Card>
    </div>
  );
}