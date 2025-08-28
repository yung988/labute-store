"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type PacketaShipment = {
  id: string;
  order_id: string;
  packeta_shipment_id: string;
  customer_name: string;
  customer_email: string;
  status: string;
  created_at: string;
};

export default function PacketaManagement() {
  const [shipments, setShipments] = useState<PacketaShipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const loadShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/packeta/shipments");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setShipments(json.shipments);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  const printLabel = async (orderId: string, format: string = 'A6') => {
    try {
      const res = await fetch(`/api/admin/packeta/print-label/${orderId}?format=${encodeURIComponent(format)}`);
      if (!res.ok) throw new Error("Failed to get label");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `packeta-label-${orderId}-${format.replace(' ', '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to print label");
    }
  };

  const showFormatDialog = (orderId: string) => {
    const format = prompt(
      "Vyberte formát štítku:\n1 = A6 (1 štítek na stránku)\n2 = A6 on A4 (4 štítky na stránku)\n\nZadejte číslo:",
      "1"
    );
    
    if (format === null) return; // User cancelled
    
    const formatMap: Record<string, string> = {
      "1": "A6",
      "2": "A6 on A4"
    };
    
    const selectedFormat = formatMap[format] || "A6";
    printLabel(orderId, selectedFormat);
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === shipments.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(shipments.map(s => s.order_id)));
    }
  };

  const createShipment = async (orderId: string) => {
    try {
      setLoading(true);
      setDebugInfo(null);
      const res = await fetch("/api/admin/packeta/create-shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Failed to create shipment");

      alert(`✅ Zásilka vytvořena!\n\nPacketa ID: ${result.packetaId}\nTracking: ${result.trackingId}\n\nKlikněte na 'Zobrazit debug' pro podrobnosti.`);

      // Store debug info
      setDebugInfo(result);

      loadShipments(); // Refresh the list
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create shipment");
    } finally {
      setLoading(false);
    }
  };

  const bulkPrintLabels = async () => {
    if (selectedOrders.size === 0) {
      alert("Vyberte alespoň jednu objednávku");
      return;
    }

    const format = prompt(
      "Vyberte formát štítku:\n1 = A6 (1 štítek na stránku)\n2 = A6 on A4 (4 štítky na stránku)\n\nZadejte číslo:",
      "2"
    );

    if (format === null) return;

    const formatMap: Record<string, string> = {
      "1": "A6",
      "2": "A6 on A4"
    };

    const selectedFormat = formatMap[format] || "A6";

    try {
      setLoading(true);
      const res = await fetch("/api/admin/packeta/bulk-print-labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: Array.from(selectedOrders),
          format: selectedFormat
        })
      });

      if (!res.ok) throw new Error("Failed to get bulk labels");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `packeta-labels-bulk-${selectedFormat.replace(' ', '-')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSelectedOrders(new Set()); // Clear selection after successful print
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to bulk print labels");
    } finally {
      setLoading(false);
    }
  };

  const trackShipment = async (packetaId: string) => {
    try {
      const res = await fetch(`/api/admin/packeta/track/${packetaId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to track");
      alert(`Status: ${json.status}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to track");
    }
  };

  const cancelShipment = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this shipment?")) return;
    
    try {
      const res = await fetch("/api/admin/packeta/cancel-shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to cancel");
      
      alert("Shipment cancelled successfully");
      loadShipments(); // Refresh the list
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to cancel shipment");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="flex flex-col gap-6">
      {selectedOrders.size > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border">
          <div className="flex justify-between items-center">
            <span>Vybráno {selectedOrders.size} objednávek</span>
            <div className="flex gap-2">
              <Button onClick={bulkPrintLabels} disabled={loading}>
                {loading ? "Připravuji..." : "Hromadný tisk štítků"}
              </Button>
              <Button variant="outline" onClick={() => setSelectedOrders(new Set())}>
                Zrušit výběr
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="overflow-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 border">
                <input
                  type="checkbox"
                  checked={shipments.length > 0 && selectedOrders.size === shipments.length}
                  onChange={toggleSelectAll}
                  title="Vybrat vše"
                />
              </th>
              <th className="p-2 border">Order ID</th>
              <th className="p-2 border">Packeta ID</th>
              <th className="p-2 border">Customer</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Created</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((shipment) => (
              <tr key={shipment.id} className="odd:bg-background even:bg-muted/30">
                <td className="p-2 border align-top text-center">
                  <input
                    type="checkbox"
                    checked={selectedOrders.has(shipment.order_id)}
                    onChange={() => toggleOrderSelection(shipment.order_id)}
                  />
                </td>
                <td className="p-2 border align-top">{shipment.order_id}</td>
                <td className="p-2 border align-top">{shipment.packeta_shipment_id}</td>
                <td className="p-2 border align-top">{shipment.customer_name}</td>
                <td className="p-2 border align-top">{shipment.customer_email}</td>
                <td className="p-2 border align-top">
                  <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                    {shipment.status}
                  </span>
                </td>
                <td className="p-2 border align-top">
                  {new Date(shipment.created_at).toLocaleString()}
                </td>
                <td className="p-2 border align-top whitespace-nowrap">
                  <div className="flex gap-1 flex-wrap">
                    {!shipment.packeta_shipment_id ? (
                      <Button
                        size="sm"
                        onClick={() => createShipment(shipment.order_id)}
                        disabled={loading}
                      >
                        {loading ? "..." : "Vytvořit zásilku"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => showFormatDialog(shipment.order_id)}
                        >
                          Print Label
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => trackShipment(shipment.packeta_shipment_id)}
                        >
                          Track
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelShipment(shipment.order_id)}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {shipments.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No Packeta shipments found
        </div>
      )}

      {debugInfo && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">🔍 Debug informace</h3>
            <Button variant="outline" size="sm" onClick={() => setDebugInfo(null)}>
              Zavřít
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-green-700">✅ Úspěch</h4>
              <p>Packeta ID: <code className="bg-gray-200 px-1 rounded">{debugInfo.packetaId}</code></p>
              <p>Tracking ID: <code className="bg-gray-200 px-1 rounded">{debugInfo.trackingId}</code></p>
              <p>Barcode: <code className="bg-gray-200 px-1 rounded">{debugInfo.packetaBarcode}</code></p>
              <p><a href={debugInfo.trackingUrl} target="_blank" className="text-blue-600 underline">Tracking URL</a></p>
            </div>

            <div>
              <h4 className="font-medium text-blue-700">📡 API odpověď</h4>
              <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-auto max-h-40">
                {debugInfo.debug?.xmlResponse || 'N/A'}
              </pre>
            </div>

            <div>
              <h4 className="font-medium text-purple-700">📤 Odeslaný XML</h4>
              <pre className="bg-gray-800 text-yellow-400 p-3 rounded text-sm overflow-auto max-h-40">
                {debugInfo.debug?.xmlRequest || 'N/A'}
              </pre>
            </div>

            <div>
              <h4 className="font-medium text-gray-700">⚙️ Konfigurace</h4>
              <p>API URL: <code className="bg-gray-200 px-1 rounded">{debugInfo.debug?.apiUrl}</code></p>
              <p>Eshop ID: <code className="bg-gray-200 px-1 rounded">{debugInfo.debug?.eshopId}</code></p>
              <p>API Key délka: <code className="bg-gray-200 px-1 rounded">{debugInfo.debug?.apiKeyLength}</code></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}