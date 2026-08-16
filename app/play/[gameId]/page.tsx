import { PlayPageContent } from '../PlayPageContent'
import { PlayCardBootstrap } from '../PlayCardBootstrap'

export default async function PlayByGameIdPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>
  searchParams: Promise<{ cardId?: string; hint?: string }>
}) {
  const { gameId } = await params
  const sp = await searchParams
  const cardId = sp.cardId?.trim() ?? ''

  if (!cardId) {
    return <PlayCardBootstrap gameId={gameId} lyricHint={sp.hint ?? null} />
  }

  return (
    <PlayPageContent
      gameId={gameId}
      cardId={cardId}
      lyricHint={sp.hint ?? null}
    />
  )
}
