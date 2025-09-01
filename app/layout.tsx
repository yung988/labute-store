import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { CartProvider } from '@/context/CartContext';
import { ConditionalLayout } from '@/components/ConditionalLayout';
import { ReactLenis } from 'lenis/react';
import './globals.css';
import { PostHogProvider } from '@/components/PostHogProvider';

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'Yeezuz2020 Store',
  description: '2020',
};

const geistSans = Geist({
  variable: '--font-geist-sans',
  display: 'swap',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body className={`${geistSans.className} antialiased`}>
        <PostHogProvider>
          <ReactLenis root>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={false}
              disableTransitionOnChange
            >
              <CartProvider>
                <ConditionalLayout>{children}</ConditionalLayout>
              </CartProvider>
            </ThemeProvider>
          </ReactLenis>
        </PostHogProvider>
      </body>
    </html>
  );
}
