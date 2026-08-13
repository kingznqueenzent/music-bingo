/**
 * SEO config — re-exports from site-config (single source of truth).
 * Organization schema only — no invented ratings, awards, or street addresses.
 */
const siteConfig = require('../site-config')

const siteUrl = String(siteConfig.siteUrl || 'https://kingznqueenzent.ca').replace(/\/$/, '')

const seoConfig = {
  metaDescription: siteConfig.seo.metaDescription,
  title: siteConfig.seo.title,
  keywords: siteConfig.seo.keywords,
  openGraphImage: siteConfig.seo.openGraphImage,
  twitterCardImage: siteConfig.seo.twitterCardImage,
  canonicalUrl: siteUrl,
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.brand.name,
    alternateName: 'Kingz and Queenz Entertainment',
    description: siteConfig.seo.metaDescription,
    url: siteUrl,
    logo: `${siteUrl}${siteConfig.assets.logo.main}`,
    ...(siteConfig.contact.phone ? { telephone: siteConfig.contact.phone } : {}),
    ...(siteConfig.contact.email ? { email: siteConfig.contact.email } : {}),
  },
}

module.exports = seoConfig
