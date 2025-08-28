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

  const printLabel = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/packeta/print-label/${orderId}`);
      if (!res.ok) throw new Error("Failed to get label");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `packeta-label-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to print label");
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
      <div className="overflow-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-muted">
            <tr>
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
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => printLabel(shipment.order_id)}
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
    </div>
  );
}