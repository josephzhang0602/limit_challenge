import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import AppShell from '@/components/layout/AppShell';

import Providers from './providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Fleet Tracker',
  description: 'Vehicles, offices, mechanics and maintenance history of the fleet',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The color scheme script sets a class on <html> before React loads, which
    // React did not render: suppressHydrationWarning accepts that difference.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Applies the saved color scheme before the first paint, so a user of
            dark mode never sees a white flash. */}
        <InitColorSchemeScript attribute="class" defaultMode="system" />
        {/* Sends the Material UI styles with the HTML of the server, so the
            browser receives the same markup that React renders. */}
        <AppRouterCacheProvider>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
