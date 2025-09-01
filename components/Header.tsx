'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { CartTrigger } from '@/components/CartTrigger';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();
  // Hide header on cart page
  if (pathname?.startsWith('/cart')) {
    return null;
  }

  return (
    <>
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 2xl:px-24 max-w-[1400px]">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="text-2xl font-medium text-black hover:text-gray-700 transition-colors"
            >
              YEEZUZ2020
            </Link>

            {/* Right side buttons */}
            <div className="flex items-center gap-2">
              {/* Search icon (link to home for now) */}
              <Button asChild variant="ghost" size="sm" aria-label="Hledat">
                <Link href="/">
                  <Search className="h-5 w-5" />
                </Link>
              </Button>
              {/* Cart */}
              <CartTrigger />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
