import { requireAdminSession } from '@/lib/admin-guard-server'
import { SitemapClient } from './SitemapClient'

export const metadata = {
  title: 'Sitemap — LyricGrid',
  robots: { index: false, follow: false },
}

export default async function SitemapPage() {
  await requireAdminSession('/sitemap')
  return <SitemapClient />
}
