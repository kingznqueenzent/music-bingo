'use client'

import { useCallback, useRef } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { playSfxPreset, readSfxVolume } from '@/lib/sfx/play-sfx'
import type { BingoClaimPayload } from '@/lib/supabase-realtime'
import { toEvaluatorPattern, verifyBingoFromCells } from '@/lib/bingo-evaluator'
import { getWinningPositions, normalizeWinPattern } from '@/lib/bingo-win-pattern'
import { playlistSongLabel } from '@/lib/media-display'
import type { ClaimMatrixCell } from '@/components/host/BingoClaimVerificationModal'

export type HostClaimModalState = {
  open: boolean
  playerName: string
  cardId: string
  pattern: string
  valid: boolean
  validationError: string | null
  markedPlaylistSongIds: string[]
  cells: ClaimMatrixCell[]
  gridSize: 4 | 5
  claimedAt: string | null
}

export const EMPTY_HOST_CLAIM_MODAL: HostClaimModalState = {
  open: false,
  playerName: '',
  cardId: '',
  pattern: 'LINE',
  valid: false,
  validationError: null,
  markedPlaylistSongIds: [],
  cells: [],
  gridSize: 5,
  claimedAt: null,
}

type SongLike = { id: string; title?: string | null; youtube_id?: string | null }

type UseHostClaimsOptions = {
  supabase: SupabaseClient
  gridSize: 4 | 5
  /** Currently called playlist_song ids (host played list). */
  calledPlaylistSongIds: string[]
  songs: SongLike[]
  /** Optional pause of host auto-advance / clip timer when a claim arrives. */
  onClaimInterrupt?: () => void
  /** Play subtle host chime (default true). */
  playChime?: boolean
}

/**
 * Builds the host Instant Bingo verification payload from a realtime claim.
 * Dedupes rapid duplicate INSERT + broadcast for the same card.
 */
export function useHostClaims(options: UseHostClaimsOptions) {
  const {
    supabase,
    gridSize,
    calledPlaylistSongIds,
    songs,
    onClaimInterrupt,
    playChime = true,
  } = options

  const lastClaimKeyRef = useRef<string>('')
  const calledRef = useRef(calledPlaylistSongIds)
  calledRef.current = calledPlaylistSongIds
  const songsRef = useRef(songs)
  songsRef.current = songs
  const gridRef = useRef(gridSize)
  gridRef.current = gridSize

  const buildClaimModal = useCallback(
    async (payload: BingoClaimPayload): Promise<HostClaimModalState | null> => {
      const claimKey = `${payload.cardId}:${(payload.markedPlaylistSongIds ?? []).join(',')}`
      if (claimKey === lastClaimKeyRef.current) return null
      lastClaimKeyRef.current = claimKey
      // Allow a later claim for same card after host closes modal.
      window.setTimeout(() => {
        if (lastClaimKeyRef.current === claimKey) lastClaimKeyRef.current = ''
      }, 2500)

      if (playChime) {
        try {
          playSfxPreset('drumroll', Math.min(0.55, readSfxVolume()))
        } catch {
          /* ignore autoplay / missing asset */
        }
      }
      onClaimInterrupt?.()

      const pattern = toEvaluatorPattern(String(payload.pattern))
      const winMode = normalizeWinPattern(String(payload.pattern))
      const calledIds = calledRef.current
      const calledSet = new Set(calledIds)
      const markedSet = new Set(payload.markedPlaylistSongIds ?? [])
      const gridSizeLocal = gridRef.current

      const { data: cells } = await supabase
        .from('card_cells')
        .select('position, playlist_song_id')
        .eq('card_id', payload.cardId)
        .order('position')

      let boardCells = cells ?? []
      if (boardCells.length === 0) {
        const { data: card } = await supabase
          .from('cards')
          .select('grid_data')
          .eq('id', payload.cardId)
          .single()
        const grid = Array.isArray(card?.grid_data) ? card.grid_data : []
        boardCells = grid
          .map((cell, idx) => {
            const c = cell as { position?: number; playlist_song_id?: string; track_id?: string }
            const songId = c.playlist_song_id ?? c.track_id
            if (!songId) return null
            return { position: c.position ?? idx, playlist_song_id: songId }
          })
          .filter(Boolean) as { position: number; playlist_song_id: string }[]
      }

      const result = verifyBingoFromCells(
        boardCells,
        payload.markedPlaylistSongIds,
        calledIds,
        pattern,
        gridSizeLocal
      )
      const patternWins = getWinningPositions(markedSet, boardCells, gridSizeLocal, winMode)
      const winning = new Set(result.winningPositions ?? patternWins ?? [])

      const songIds = [...new Set(boardCells.map((c) => c.playlist_song_id))]
      const titleById = new Map<string, string>()
      for (const s of songsRef.current) {
        if (songIds.includes(s.id)) {
          titleById.set(s.id, playlistSongLabel(s))
        }
      }
      const missing = songIds.filter((id) => !titleById.has(id))
      if (missing.length > 0) {
        const { data: extra } = await supabase
          .from('playlist_songs')
          .select('id, title, youtube_id')
          .in('id', missing)
        for (const row of extra ?? []) {
          titleById.set(row.id, row.title || row.youtube_id || '—')
        }
      }

      const matrix: ClaimMatrixCell[] = boardCells.map((c) => ({
        position: c.position,
        title: titleById.get(c.playlist_song_id) ?? null,
        called: calledSet.has(c.playlist_song_id),
        marked: markedSet.has(c.playlist_song_id),
        winning: winning.has(c.position),
      }))

      return {
        open: true,
        playerName: payload.playerName ?? 'Player',
        cardId: payload.cardId,
        pattern,
        valid: result.valid,
        validationError: result.error ?? null,
        markedPlaylistSongIds: [...(payload.markedPlaylistSongIds ?? [])],
        cells: matrix,
        gridSize: gridSizeLocal,
        claimedAt: payload.claimedAt ?? new Date().toISOString(),
      }
    },
    [onClaimInterrupt, playChime, supabase]
  )

  return { buildClaimModal }
}
