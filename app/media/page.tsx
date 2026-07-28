import Link from 'next/link'
import { MediaLibrary } from './MediaManager'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ theme?: string }> }

export default async function MediaPage({ searchParams }: Props) {
  const { theme } = await searchParams
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <Link href="/lyricgrid" className="text-slate-300 hover:text-white text-sm">
          ← Back to Home
        </Link>
      </div>
      <section className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-2">
          Media Manager
        </h1>
        <p className="text-slate-300 mb-8">
          Browse your seeded song catalog (Dancehall, Reggae, 80s Pop) or upload MP3/MP4 for local games.
        </p>
        <MediaLibrary initialThemeId={theme ?? null} />
      </section>
    </main>
  )
}
