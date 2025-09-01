'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session_id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vyčisti košík a checkout data po úspěšné platbě
    if (sessionId) {
      localStorage.removeItem('cart');
      localStorage.removeItem('checkout-form-data');
      localStorage.removeItem('checkout-delivery-method');
      localStorage.removeItem('checkout-pickup-point');

      // Pošli storage event aby se aktualizoval košík v jiných tabech
      window.dispatchEvent(new StorageEvent('storage', { key: 'cart', newValue: null }));
    }
    setLoading(false);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 w-full">
      <div className="text-center max-w-md w-full mx-auto">
        <div className="mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-medium tracking-wide uppercase text-gray-900 mb-2">
            YEEZUZ2020
          </h1>
          <h2 className="text-base sm:text-lg font-light text-gray-700 mb-4">
            Platba byla úspěšná!
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed px-2">
            Děkujeme za vaši objednávku. Brzy vám pošleme e-mail s potvrzením a informacemi o
            doručení.
          </p>
        </div>

        <div className="space-y-4">
          <Link href="/">
            <Button className="w-full bg-gray-900 hover:bg-black text-white uppercase tracking-wide text-xs font-medium py-3 rounded-none">
              Pokračovat v nákupu
            </Button>
          </Link>

          {sessionId && (
            <p className="text-xs text-gray-400 break-all px-2">ID platby: {sessionId}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
