'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type TrackingInfo = {
  orderId: string;
  status: string;
  packetaId?: string;
  trackingUrl?: string;
  lastUpdate?: string;
  statusText?: string;
};

export default function TrackOrderPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [tracking, setTracking] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const loadTracking = async () => {
      try {
        setLoading(true);
        setError(null);

        // This would be a public API endpoint (no auth required)
        const res = await fetch(`/api/track/${orderId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to load tracking');

        setTracking(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load tracking');
      } finally {
        setLoading(false);
      }
    };

    loadTracking();
  }, [orderId]);

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-gray-100 text-gray-800',
      paid: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-500 text-white',
      cancelled: 'bg-red-100 text-red-800',
      returned: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Sledování objednávky</h1>
            <p>Načítám...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Chyba</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardHeader>
              <CardTitle>Objednávka nenalezena</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Objednávka s ID {orderId} nebyla nalezena.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sledování objednávky</h1>
          <p className="text-gray-600">
            ID objednávky:{' '}
            <span className="font-mono font-semibold">#{orderId.slice(-8).toUpperCase()}</span>
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Stav objednávky
              <Badge className={getStatusColor(tracking.status)}>{tracking.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tracking.statusText && <p className="text-lg">{tracking.statusText}</p>}

              {tracking.lastUpdate && (
                <p className="text-sm text-gray-600">
                  Poslední aktualizace: {new Date(tracking.lastUpdate).toLocaleString('cs-CZ')}
                </p>
              )}

              {tracking.packetaId && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">📦 Zásilkovna</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Číslo zásilky: <span className="font-mono">{tracking.packetaId}</span>
                  </p>

                  {tracking.trackingUrl && (
                    <a
                      href={tracking.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                      Sledovat na Zásilkovna.cz ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>Potřebujete pomoct? Kontaktujte nás na support@yeezuz2020.store</p>
        </div>
      </div>
    </div>
  );
}
