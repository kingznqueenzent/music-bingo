import type { BingoTrackLibraryRow } from '@/lib/media/bingo-track-library'

export type ThemeOption = { id: string; name: string }

export type TrackUpdatePayload = {
  title: string
  artist: string | null
  genre: string | null
  file_url: string | null
  theme_id: string | null
}

export type { BingoTrackLibraryRow }
