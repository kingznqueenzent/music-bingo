import Link from 'next/link'
import { JoinForm } from './JoinForm'

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const params = await searchParams
  const initialCode = params?.code?.trim().toUpperCase() ?? ''

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-8 text-white">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-12 text-slate-100">
        <span className="block">📱 Join Game</span>
      </h1>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-md shadow-black/40 p-12 max-w-md w-full">
        <JoinForm initialGameCode={initialCode} />
      </div>

      <Link href="/" className="mt-12 text-slate-300 hover:text-white text-lg transition-colors">
        ← Back to Home
      </Link>
    </main>
  )
}
