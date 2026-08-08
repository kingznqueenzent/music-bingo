import type { Metadata } from 'next'
import { Playfair_Display, Lato } from 'next/font/google'
import { KINGZ_CONTACT } from '@/lib/kingz/data'
import '@/styles/kingz.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-kingz-playfair',
  display: 'swap',
})

const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-kingz-lato',
  display: 'swap',
})

const siteUrl = process.env.NEXT_PUBLIC_KINGZ_SITE_URL ?? 'https://kingzqueenz-g5vpu6na.manus.space'

export const metadata: Metadata = {
  title: 'Kingz & Queenz Entertainment | Premium DJ Service — Brantford, ON',
  description:
    'Premium DJ entertainment for weddings, corporate events, and parties in Brantford, ON. Official merch, Patreon, digital mixtapes, and event packages from DJ Liz & DJ Merci.',
  keywords: [
    'DJ Brantford',
    'wedding DJ Ontario',
    'corporate event DJ',
    'Kingz Queenz Entertainment',
    'premium DJ service',
    'party DJ Brantford',
    'DJ merch',
    'Patreon DJ',
    'event DJ packages',
  ],
  authors: [{ name: 'Kingz & Queenz Entertainment' }],
  openGraph: {
    title: 'Kingz & Queenz Entertainment — Premium DJ Experience',
    description: 'Luxury DJ services for weddings, corporate events, and celebrations in Brantford, ON.',
    url: siteUrl,
    siteName: 'Kingz & Queenz Entertainment',
    locale: 'en_CA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kingz & Queenz Entertainment',
    description: 'Premium DJ Experience in Brantford, ON',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: siteUrl },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Kingz & Queenz Entertainment',
  description: 'Premium DJ service for weddings, corporate events, and parties',
  url: siteUrl,
  telephone: KINGZ_CONTACT.phone,
  email: KINGZ_CONTACT.email,
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Brantford',
    addressRegion: 'ON',
    addressCountry: 'CA',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '500',
  },
  priceRange: '$$$',
  sameAs: [KINGZ_CONTACT.twitch, KINGZ_CONTACT.kick],
}

export default function KingzLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`kingz-site ${playfair.variable} ${lato.variable} min-h-dvh`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  )
}
