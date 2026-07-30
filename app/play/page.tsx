import { PlayPageContent } from './PlayPageContent'

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ cardId?: string; gameId?: string; hint?: string }>
}) {
  const params = await searchParams
  return (
    <PlayPageContent
      gameId={params.gameId ?? ''}
      cardId={params.cardId ?? ''}
      lyricHint={params.hint ?? null}
    />
  )
}
