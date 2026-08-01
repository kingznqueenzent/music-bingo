import { requireAdminSession } from '@/lib/admin-guard-server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Media Library — LyricGrid',
  description:
    'Production Media Manager — upload MP3/MP4 to Supabase Storage, assign themes, preview audio, and manage the LyricGrid catalog',
}

export default async function MediaManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminSession('/media-manager')
  return children
}
