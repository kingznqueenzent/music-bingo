import Link from 'next/link'
import { JoinForm } from './JoinForm'
import { getDefaultJoinRoomCode } from '@/lib/default-room-code'
import { StaffAccessFooterLink } from '@/components/layout/StaffAccessFooterLink'

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const params = await searchParams
  const initialCode = params?.code?.trim().toUpperCase() || getDefaultJoinRoomCode()

  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-8 text-white">
      <h1 className="text-2xl md:text-3xl font-extrabold mb-8 text-slate-100 text-center">📱 Join Game</h1>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-md shadow-black/40 p-8 md:p-12 max-w-md w-full">
        <JoinForm initialGameCode={initialCode} />
      </div>

      <Link href="/lyricgrid" className="mt-12 text-slate-300 hover:text-white text-lg transition-colors">
        ← Back to Home
      </Link>
      <div className="mt-4">
        <StaffAccessFooterLink from="/join" />
      </div>
    </main>
  )
}
