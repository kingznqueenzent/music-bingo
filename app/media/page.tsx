import Link from 'next/link'
import { MediaManager } from './MediaManager'

export default function MediaPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <Link href="/" className="text-slate-300 hover:text-white text-sm">
          ← Back to Home
        </Link>
      </div>
      <section className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-2">
          Media Manager
        </h1>
        <p className="text-slate-300 mb-8">
          Upload and index MP3 or MP4 files from your computer. Use them in playlists for local-only games or mix with YouTube.
        </p>
        <MediaManager />
      </section>
    </main>
  )
}
