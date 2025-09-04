'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import OrderDetail from '@/components/admin/orders/OrderDetail';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const handleBack = () => {
    router.push('/admin/orders');
  };

  if (!orderId) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600">ID objednávky nenalezeno</p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zpět na objednávky
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zpět na objednávky
        </Button>
        <h1 className="text-2xl font-bold">Detail objednávky</h1>
      </div>

      <OrderDetail orderId={orderId} onClose={handleBack} />
    </div>
  );
}
