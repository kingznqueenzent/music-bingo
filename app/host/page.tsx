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
