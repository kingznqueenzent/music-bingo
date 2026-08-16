import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { ClientAppShell } from "@/components/ClientAppShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://lyricgrid.ca'),
  title: {
    default: 'LyricGrid | Professional Music Bingo & Live Event Engine',
    template: '%s | LyricGrid',
  },
  description:
    'The ultimate BYOM music bingo and live event streaming platform for professional DJs and hosts.',
  applicationName: 'LyricGrid',
  authors: [{ name: 'Kingz & Queenz Entertainment' }],
  generator: 'Next.js',
  keywords: ['Music Bingo', 'DJ Software', 'Live Streaming', 'Blind Bingo', 'LyricGrid'],
  icons: {
    icon: '/assets/logo/favicon.ico',
    shortcut: '/assets/logo/favicon.png',
    apple: '/assets/logo/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    url: 'https://lyricgrid.ca',
    siteName: 'LyricGrid',
    title: 'LyricGrid | Professional Music Bingo',
    description: 'Interactive music bingo, blind mode, and live event production engine.',
  },
};

/** Device-width viewport + manipulation touch model reduces legacy tap delay on mobile. */
export const viewport: Viewport = {
  themeColor: '#121212',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        <ClientAppShell>{children}</ClientAppShell>
      </body>
    </html>
  );
}
