import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { CartProvider } from '@/context/CartContext';
import { ConditionalLayout } from '@/components/ConditionalLayout';
import { ReactLenis } from 'lenis/react';
import './globals.css';
import { PostHogProvider } from '@/components/PostHogProvider';
import { Toaster } from '@/components/ui/sonner';

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'YEEZUZ2020 | Oficiální e-shop',
  description: 'Oficiální e-shop YEEZUZ2020 - oblečení a hudební CD. Doprava po celé ČR.',
  openGraph: {
    title: 'YEEZUZ2020 | Oficiální e-shop',
    description: 'Oficiální e-shop YEEZUZ2020 - oblečení a hudební CD. Doprava po celé ČR.',
    url: 'https://yeezuz2020.cz',
    siteName: 'YEEZUZ2020',
    locale: 'cs_CZ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YEEZUZ2020 | Oficiální e-shop',
    description: 'Oficiální e-shop YEEZUZ2020 - oblečení a hudební CD.',
  },
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
    <html lang="cs" suppressHydrationWarning>
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
                <Toaster />
              </CartProvider>
            </ThemeProvider>
          </ReactLenis>
        </PostHogProvider>
      </body>
    </html>
  );
}
