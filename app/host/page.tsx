import Link from 'next/link'
import { HostCreateForm } from './HostCreateForm'

export default function HostPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center p-8 text-white">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-slate-100">
        <span className="block">🖥️ Host Control Panel</span>
      </h1>

      <div className="flex flex-wrap justify-center gap-4 mb-8 max-w-2xl">
        <a
          href="/host/create-from-media"
          className="rounded-2xl border border-slate-700 bg-slate-900/70 px-8 py-4 text-lg font-semibold text-slate-100 hover:border-emerald-500/50 hover:bg-slate-800/70 transition-colors"
        >
          📁 Create from Media Library
        </a>
        <a
          href="/host/import-youtube"
          className="rounded-2xl border border-slate-700 bg-slate-900/70 px-8 py-4 text-lg font-semibold text-slate-100 hover:border-emerald-500/50 hover:bg-slate-800/70 transition-colors"
        >
          📺 Import YouTube songs (playlist or URLs)
        </a>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-md shadow-black/40 p-8 max-w-2xl w-full mb-8">
        <h2 className="text-xl font-bold mb-2 text-slate-50">Load songs into a theme</h2>
        <p className="text-slate-400 text-sm mb-4">
          Pick a theme, then add YouTube links or upload MP3/MP4 so they show up in the right section for players.
        </p>
        <div className="flex flex-wrap gap-3 mb-3">
          <a
            href="/host/import-youtube?theme=a1000000-0000-0000-0000-000000000016"
            className="rounded-xl border border-slate-600 bg-slate-800/80 px-5 py-3 font-medium text-slate-100 hover:border-emerald-500/50 hover:bg-slate-700/80 transition-colors"
          >
            90&apos;s Hip-Hop (YouTube)
          </a>
          <a
            href="/host/import-youtube?theme=a1000000-0000-0000-0000-000000000015"
            className="rounded-xl border border-slate-600 bg-slate-800/80 px-5 py-3 font-medium text-slate-100 hover:border-emerald-500/50 hover:bg-slate-700/80 transition-colors"
          >
            90&apos;s Reggae (YouTube)
          </a>
          <a
            href="/host/import-youtube?theme=a1000000-0000-0000-0000-000000000017"
            className="rounded-xl border border-slate-600 bg-slate-800/80 px-5 py-3 font-medium text-slate-100 hover:border-emerald-500/50 hover:bg-slate-700/80 transition-colors"
          >
            80&apos;s Rock (YouTube)
          </a>
          <a
            href="/host/import-youtube?theme=a1000000-0000-0000-0000-000000000018"
            className="rounded-xl border border-slate-600 bg-slate-800/80 px-5 py-3 font-medium text-slate-100 hover:border-emerald-500/50 hover:bg-slate-700/80 transition-colors"
          >
            2000&apos;s Dancehall (YouTube)
          </a>
          <a
            href="/host/import-youtube?theme=a1000000-0000-0000-0000-000000000019"
            className="rounded-xl border border-slate-600 bg-slate-800/80 px-5 py-3 font-medium text-slate-100 hover:border-emerald-500/50 hover:bg-slate-700/80 transition-colors"
          >
            Afrobeats 2010–2026 (YouTube)
          </a>
          <a
            href="/host/import-youtube"
            className="rounded-xl border border-slate-600 bg-slate-800/80 px-5 py-3 font-medium text-slate-400 hover:border-slate-500 hover:bg-slate-700/80 transition-colors"
          >
            All themes…
          </a>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="/media?theme=a1000000-0000-0000-0000-000000000016"
            className="rounded-xl border border-slate-600 bg-slate-800/80 px-5 py-3 font-medium text-slate-100 hover:border-emerald-500/50 hover:bg-slate-700/80 transition-colors"
          >
            90&apos;s Hip-Hop (MP3/MP4)
          </a>
          <a
            href="/media?theme=a1000000-0000-0000-0000-000000000015"
            className="rounded-xl border border-slate-600 bg-slate-800/80 px-5 py-3 font-medium text-slate-100 hover:border-emerald-500/50 hover:bg-slate-700/80 transition-colors"
          >
            90&apos;s Reggae (MP3/MP4)
          </a>
          <a
            href="/media?theme=a1000000-0000-0000-0000-000000000017"
            className="rounded-xl border border-slate-600 bg-slate-800/80 px-5 py-3 font-medium text-slate-100 hover:border-emerald-500/50 hover:bg-slate-700/80 transition-colors"
          >
            80&apos;s Rock (MP3/MP4)
          </a>
          <a
            href="/media?theme=a1000000-0000-0000-0000-000000000018"
            className="rounded-xl border border-slate-600 bg-slate-800/80 px-5 py-3 font-medium text-slate-100 hover:border-emerald-500/50 hover:bg-slate-700/80 transition-colors"
          >
            2000&apos;s Dancehall (MP3/MP4)
          </a>
          <a
            href="/media?theme=a1000000-0000-0000-0000-000000000019"
            className="rounded-xl border border-slate-600 bg-slate-800/80 px-5 py-3 font-medium text-slate-100 hover:border-emerald-500/50 hover:bg-slate-700/80 transition-colors"
          >
            Afrobeats 2010–2026 (MP3/MP4)
          </a>
          <a
            href="/media"
            className="rounded-xl border border-slate-600 bg-slate-800/80 px-5 py-3 font-medium text-slate-400 hover:border-slate-500 hover:bg-slate-700/80 transition-colors"
          >
            Media Manager (all)
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-md shadow-black/40 p-12 max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-6 text-slate-50">Create with YouTube links</h2>
        <p className="text-slate-300 mb-8">
          Paste one YouTube link per line (min 45 for 5×5, 32 for 4×4). Each link is one square on the bingo cards.
        </p>
        <HostCreateForm />
      </div>

      <Link href="/" className="mt-12 text-slate-300 hover:text-white text-lg transition-colors">
        ← Back to Home
      </Link>
    </main>
  )
}
