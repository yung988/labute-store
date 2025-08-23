import Link from "next/link";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh flex flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center gap-6">
          <Link href="/admin" className="font-semibold text-lg">
            Admin
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="hover:underline">
              Orders
            </Link>
            <Link href="/admin/inventory" className="hover:underline">
              Inventory
            </Link>
            <Link href="/admin/packeta" className="hover:underline">
              Packeta
            </Link>
          </nav>
          <div className="ml-auto text-sm">
            <Link href="/" className="hover:underline">
              Back to store
            </Link>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 flex-1">{children}</main>
    </div>
  );
}
