import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    default: 'KRAXXBot — Professional Discord Bot',
    template: '%s | KRAXXBot',
  },
  description:
    'KRAXXBot brings professional moderation, support tickets, automation, and analytics to Discord communities worldwide.',
  metadataBase: new URL('https://kraxxbot.kraxxsec.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://kraxxbot.kraxxsec.com',
    siteName: 'KRAXXBot',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body style={{
        background: '#090908',
        color: '#F3F0E9',
        fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        margin: 0,
        padding: 0,
        minHeight: '100vh',
      }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
