import Link from 'next/link'
import { StageGameForm } from './StageGameForm'

export const metadata = {
  title: 'Stage — LyricGrid',
  description: 'Open the stage view for a game',
}

export default function StageLandingPage() {
  return (
    <main className="min-h-[calc(100vh-3rem)] px-6 py-10 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Stage</h1>
      <p className="text-white/60 text-sm mb-6">
        Enter your game ID (from the host dashboard URL) to open the big-screen stage view.
      </p>
      <StageGameForm />
      <p className="mt-8 text-sm text-white/40">
        <Link href="/host" className="text-brand-neon hover:underline">
          Host dashboard
        </Link>{' '}
        — create a game and copy the stage link from there.
      </p>
    </main>
  )
}
