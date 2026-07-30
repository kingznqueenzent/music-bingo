import Link from 'next/link'
import { StageGameForm } from './StageGameForm'

export const metadata = {
  title: 'Stage — LyricGrid',
  description: 'Open the venue broadcast stage view for a game',
}

export default function StageLandingPage() {
  return (
    <main className="min-h-[calc(100vh-3rem)] px-6 py-10 max-w-lg mx-auto bg-[#121212] text-white">
      <p className="text-xs uppercase tracking-[0.25em] text-[#FFD700]/80 mb-2">Broadcast</p>
      <h1 className="text-3xl font-black text-[#00FFFF] mb-2">Stage</h1>
      <p className="text-slate-400 text-sm mb-6">
        Enter your game ID from the host dashboard URL to open the big-screen venue layout.
      </p>
      <div className="rounded-2xl border border-[#00FFFF]/20 bg-[#1E1E1E] p-6">
        <StageGameForm />
      </div>
      <p className="mt-8 text-sm text-slate-500">
        <Link href="/host" className="text-[#00FFFF]/80 hover:text-[#00FFFF] hover:underline">
          Host dashboard
        </Link>{' '}
        — create a game and copy the stage link from there.
      </p>
    </main>
  )
}
