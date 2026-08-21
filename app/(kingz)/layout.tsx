import type { Metadata } from 'next'
import { Playfair_Display, Lato } from 'next/font/google'
import siteConfig from '@/config/site-config'
import { KINGZ_CONTACT } from '@/lib/kingz/data'
import { buildUpcomingEventsJsonLd } from '@/lib/kingz/events'
import { getServiceAreaSchemaPlaces } from '@/lib/kingz/service-area'
import { KINGZ_SOCIAL_URLS } from '@/lib/kingz/social'
import '@/styles/kingz.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-kingz-playfair',
  display: 'swap',
  preload: true,
})

const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-kingz-lato',
  display: 'swap',
  preload: true,
})

const siteUrl = (siteConfig.siteUrl as string).replace(/\/$/, '') || 'https://kingznqueenzent.ca'
const seo = siteConfig.seo
const ogWidth = Number(seo.openGraphImageWidth) || 1200
const ogHeight = Number(seo.openGraphImageHeight) || 1200

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // absolute: avoids parent layout template doubling the brand name in <title>
  title: {
    absolute: seo.title,
  },
  description: seo.metaDescription,
  keywords: [...seo.keywords],
  authors: [{ name: siteConfig.brand.name }],
  creator: siteConfig.brand.name,
  publisher: siteConfig.brand.name,
  openGraph: {
    title: siteConfig.brand.name,
    description: seo.metaDescription,
    url: siteUrl,
    siteName: siteConfig.brand.name,
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: seo.openGraphImage,
        width: ogWidth,
        height: ogHeight,
        alt: siteConfig.brand.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.brand.name,
    description: seo.metaDescription,
    images: [seo.twitterCardImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: siteConfig.assets.logo.favicon,
    apple: siteConfig.assets.logo.appleTouchIcon,
  },
}

/**
 * Organization + WebSite + confirmed upcoming Event nodes.
 * No LocalBusiness street address, phone, ratings, awards, invented geo,
 * ticket offers, or organizer invention beyond verified Kingz performer credit.
 */
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: siteConfig.brand.name,
      alternateName: 'Kingz and Queenz Entertainment',
      url: siteUrl,
      description: seo.metaDescription,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}${siteConfig.assets.logo.main}`,
        width: ogWidth,
        height: ogHeight,
      },
      image: `${siteUrl}${siteConfig.assets.logo.main}`,
      ...(KINGZ_CONTACT.email ? { email: KINGZ_CONTACT.email } : {}),
      ...(KINGZ_CONTACT.phone ? { telephone: KINGZ_CONTACT.phone } : {}),
      areaServed: getServiceAreaSchemaPlaces(),
      sameAs: [
        KINGZ_SOCIAL_URLS.tiktok,
        KINGZ_SOCIAL_URLS.youtube,
        KINGZ_CONTACT.twitch,
        KINGZ_CONTACT.kick,
        siteConfig.merch.etsyStore,
        siteConfig.support.buyMeACoffee,
        siteConfig.support.patreon,
      ].filter(Boolean),
      member: [
        { '@type': 'Person', name: 'DJ Merci' },
        { '@type': 'Person', name: 'DJ Liz' },
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: siteConfig.brand.name,
      description: seo.metaDescription,
      publisher: { '@id': `${siteUrl}/#organization` },
      inLanguage: 'en-CA',
    },
    ...buildUpcomingEventsJsonLd(siteUrl),
  ],
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
