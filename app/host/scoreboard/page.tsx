import { redirect } from 'next/navigation'

/** Prefer /host/scoreboard/[gameId]. Accept ?gameId= for convenience. */
export default async function HostScoreboardIndex({
  searchParams,
}: {
  searchParams: Promise<{ gameId?: string; game?: string }>
}) {
  const sp = await searchParams
  const gameId = (sp.gameId || sp.game || '').trim()
  if (gameId) redirect(`/host/scoreboard/${gameId}`)
  redirect('/host')
}
