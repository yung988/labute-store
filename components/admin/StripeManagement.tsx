"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, CreditCard, Package, AlertCircle } from "lucide-react";

interface StripeProduct {
  id: string;
  name: string;
  active: boolean;
  default_price?: {
    unit_amount: number;
    currency: string;
  } | null;
  metadata: Record<string, string>;
}

export default function StripeManagement() {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [syncResult, setSyncResult] = useState<{ created: number; updated: number; errors: number } | null>(null);

  const syncProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stripe/sync-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSyncResult(data.results);
      alert(`✅ ${data.message}`);
      await loadProducts();
    } catch (error: unknown) {
      alert(`❌ Chyba při synchronizaci: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/admin/stripe/sync-products');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setProducts(data.products);
    } catch (error: unknown) {
      console.error('Error loading products:', error);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Stripe Product Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">🔄 Synchronizace produktů</h3>
            <p className="text-sm text-blue-700 mb-3">
              Synchronizuje produkty z vašeho webu do Stripe Product Catalog.
              Tím umožníte lepší správu produktů a pokročilé funkce Stripe.
            </p>
            <Button
              onClick={syncProducts}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Package className="w-4 h-4" />
              )}
              {loading ? 'Synchronizuji...' : 'Synchronizovat produkty'}
            </Button>
          </div>

          {syncResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Výsledky synchronizace
              </h4>
              <div className="text-sm text-green-700 space-y-1">
                <p>Vytvořeno: {syncResult.created}</p>
                <p>Aktualizováno: {syncResult.updated}</p>
                <p>Chyb: {syncResult.errors}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktuální produkty v Stripe</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Název</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Aktivní</TableHead>
                    <TableHead>Cena</TableHead>
                    <TableHead>Kategorie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="font-mono text-sm">{product.id}</TableCell>
                      <TableCell>
                        <Badge variant={product.active ? "default" : "secondary"}>
                          {product.active ? 'Aktivní' : 'Neaktivní'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {product.default_price ? (
                          <span className="font-medium">
                            {(product.default_price.unit_amount / 100).toFixed(2)} {product.default_price.currency.toUpperCase()}
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {product.metadata?.category || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Žádné produkty v Stripe nenalezeny</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}