"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NewsletterSignup from "./NewsletterSignup";

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/cart")) {
    return null;
  }
  return (
    <div className="mt-20 mb-10">
      <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 2xl:px-24 max-w-[1400px]">
        {/* Newsletter signup */}
        <div className="mb-16">
          <NewsletterSignup />
        </div>

        {/* Footer links */}
        <footer className="flex flex-wrap justify-between text-sm gap-4">
          <Link href="/pomoc" className="hover:underline">
            POMOC
          </Link>
          <Link href="/privacy" className="hover:underline">
            PRIVACY
          </Link>
          <Link href="/podminky" className="hover:underline">
            PODMÍNKY
          </Link>
          <Link href="/neprodavejte-me-osobni-udaje" className="hover:underline">
            NEPRODÁVEJTE MÉ OSOBNÍ ÚDAJE
          </Link>
          <Link href="/pristupnost" className="hover:underline">
            PŘÍSTUPNOST
          </Link>
        </footer>
      </div>
    </div>
  );
}
