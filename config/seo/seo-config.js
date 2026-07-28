/**
 * SEO config — re-exports from site-config + local placeholders.
 * Open Graph / Twitter images: public/assets/images/social/
 */
const siteConfig = require('../site-config')

const seoConfig = {
  metaDescription: siteConfig.seo.metaDescription,
  title: siteConfig.seo.title,
  keywords: siteConfig.seo.keywords,
  openGraphImage: siteConfig.seo.openGraphImage,
  twitterCardImage: siteConfig.seo.twitterCardImage,
  canonicalUrl: siteConfig.seo.canonicalUrl,
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: siteConfig.brand.name,
    description: siteConfig.seo.metaDescription,
    url: siteConfig.seo.canonicalUrl,
    telephone: siteConfig.contact.phone,
    email: siteConfig.contact.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Brantford',
      addressRegion: 'ON',
      addressCountry: 'CA',
    },
  },
}

module.exports = seoConfig
