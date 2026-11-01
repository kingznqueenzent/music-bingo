'use client'

import { ArcadeScoreboard } from '@/components/scoreboard/ArcadeScoreboard'
import { useGameScoreboard } from '@/hooks/useGameScoreboard'

export function HostArcadeScoreboardClient({ gameId }: { gameId: string }) {
  const { entries, loading, error } = useGameScoreboard(gameId)

  return (
    <ArcadeScoreboard
      entries={entries}
      loading={loading}
      error={error}
      variant="host"
      title="ARCADE SCOREBOARD"
      maxRows={100}
    />
  )
}
