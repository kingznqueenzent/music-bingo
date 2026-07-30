import { PlayPageContent } from '../PlayPageContent'

export default async function PlayByGameIdPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>
  searchParams: Promise<{ cardId?: string; hint?: string }>
}) {
  const { gameId } = await params
  const sp = await searchParams
  return (
    <PlayPageContent
      gameId={gameId}
      cardId={sp.cardId ?? ''}
      lyricHint={sp.hint ?? null}
    />
  )
}
