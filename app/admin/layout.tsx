import Link from "next/link";
import { ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-svh flex flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center gap-6">
          <Link href="/admin" className="font-semibold text-lg">
            Admin
          </Link>
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
