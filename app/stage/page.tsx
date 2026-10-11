import { StageOverlay, StageOverlayMissingGame } from './StageOverlay'
import { StageOverlayRoot } from './StageOverlayRoot'

export const dynamic = 'force-dynamic'

function isTransparentParam(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value
  const v = raw?.trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
}

export default async function StageOverlayPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string | string[]; transparent?: string | string[] }>
}) {
  const params = await searchParams
  const gameRaw = Array.isArray(params.game) ? params.game[0] : params.game
  const gameId = gameRaw?.trim() ?? ''
  const transparent = isTransparentParam(params.transparent)

  return (
    <StageOverlayRoot transparent={transparent}>
      {gameId ? (
        <StageOverlay gameId={gameId} transparent={transparent} />
      ) : (
        <StageOverlayMissingGame transparent={transparent} />
      )}
    </StageOverlayRoot>
  )
}
