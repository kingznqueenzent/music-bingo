import Link from 'next/link'
import { MediaLibrary } from '../media/MediaManager'
import { requireAdminSession } from '@/lib/admin-guard-server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Media Manager — LyricGrid',
  description: 'Song and audio asset catalog for LyricGrid hosts',
}

type Props = { searchParams: Promise<{ theme?: string }> }

export default async function MediaManagerPage({ searchParams }: Props) {
  await requireAdminSession('/media-manager')
  const { theme } = await searchParams

  return (
    <main className="min-h-[calc(100vh-3rem)] bg-[#121212] text-white">
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <Link href="/host" className="text-slate-400 hover:text-[#00FFFF] text-sm transition-colors">
          ← Host dashboard
        </Link>
      </div>
      <section className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-xs uppercase tracking-[0.25em] text-[#FFD700]/80 mb-2">Catalog</p>
        <h1 className="text-3xl md:text-4xl font-black text-[#00FFFF] mb-2">Media Manager</h1>
        <p className="text-slate-400 mb-8">
          Browse theme song libraries and upload MP3/MP4 clips for venue games.
        </p>
        <MediaLibrary initialThemeId={theme ?? null} />
      </section>
    </main>
  )
}
