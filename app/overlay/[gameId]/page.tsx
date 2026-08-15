import { GameOverlayView } from '@/components/overlay/GameOverlayView'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ gameId: string }>
}

/** Per-game transparent browser source for Meld Studio / OBS. */
export default async function GameOverlayPage({ params }: PageProps) {
  const { gameId } = await params
  return <GameOverlayView gameId={gameId} />
}
