import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Email Preview - Yeezuz2020 Store",
  description: "Preview email templates",
};

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Email Template Preview</h1>
          <div className="flex justify-center gap-4">
            <a
              href="/preview/order-confirmation"
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
            >
              Order Confirmation
            </a>
            <a
              href="/preview/shipping-confirmation"
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
            >
              Shipping Confirmation
            </a>
            <a
              href="/preview/delivered-confirmation"
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
            >
              Delivered Confirmation
            </a>
          </div>
        </div>
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
