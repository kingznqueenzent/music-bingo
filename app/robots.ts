import type { MetadataRoute } from 'next'
import siteConfig from '@/config/site-config'

/**
 * Allow indexing of the public Kingz marketing homepage.
 * Disallow product/admin routes that share this monorepo deploy.
 */
export default function robots(): MetadataRoute.Robots {
  const base = (siteConfig.siteUrl as string).replace(/\/$/, '') || 'https://kingznqueenzent.ca'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/host',
          '/host/',
          '/lyricgrid',
          '/lyricgrid/',
          '/media/',
          '/media-manager',
          '/media-manager/',
          '/admin-login',
          '/login',
          '/join',
          '/play',
          '/play/',
          '/stage',
          '/stage/',
          '/overlay',
          '/overlay/',
          '/kingz-control',
          '/sitemap',
          '/community',
          '/tournaments',
          '/tournaments/',
          '/analyze-mix',
          '/analyze-mix/',
          '/demo/',
          '/profile',
          '/leaderboard',
          '/playlists',
          '/themes',
          '/venue-packages',
          '/assets/raw/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
