import Link from 'next/link'
import { CreateFromMediaForm } from './CreateFromMediaForm'

export const dynamic = 'force-dynamic'

export default function CreateFromMediaPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <Link href="/host" className="text-slate-300 hover:text-white text-sm">
          ← Back to Host
        </Link>
      </div>
      <section className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2 text-slate-100">
          Create game from Media Library
        </h1>
        <p className="text-slate-300 mb-8">
          Select MP3 or MP4 files you’ve uploaded. You need at least 45 for a 5×5 grid or 32 for 4×4.
        </p>
        <CreateFromMediaForm />
      </section>
    </main>
  )
}
