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
  title: {
    default: 'Kingz & Queenz Entertainment',
    template: '%s | Kingz & Queenz Entertainment',
  },
  description:
    'Kingz & Queenz Entertainment — DJ Merci and DJ Liz. Premium DJ services for weddings, private events, parties, and corporate entertainment.',
  metadataBase: new URL('https://kingznqueenzent.ca'),
};

/** Device-width viewport + manipulation touch model reduces legacy tap delay on mobile. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
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
