// KRAXX Operations Platform — Root Layout
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KRAXX HQ — Operations Platform',
  description: 'Enterprise Operations & Digital Control Platform for KRAXX HQ',
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
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <body className="bg-[#F7F8FC] text-[#101828] font-sans antialiased selection:bg-indigo-500/20 selection:text-indigo-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
