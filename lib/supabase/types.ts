export type GameStatus = 'lobby' | 'playing' | 'ended'

export interface Playlist {
  id: string
  name: string
  created_at: string
}

export type PlaylistSongSource = 'youtube' | 'local' | 'spotify'

export interface PlaylistSong {
  id: string
  playlist_id: string
  source?: PlaylistSongSource
  youtube_id: string | null
  file_url: string | null
  spotify_track_id?: string | null
  album_art_url?: string | null
  title: string | null
  position: number
  created_at: string
}

export type GameTier = 'free' | 'pro' | 'enterprise'

export interface Game {
  id: string
  playlist_id: string
  theme_id?: string | null
  mode?: string
  round?: number
  code: string
  status: GameStatus
  current_song_id: string | null
  clip_seconds?: number
  crossfade_seconds?: number
  grid_size?: number
  tier?: GameTier
  logo_url?: string | null
  stage_show_leaderboard?: boolean
  created_at: string
}

export interface Card {
  id: string
  game_id: string
  player_name: string
  player_identifier: string | null
  created_at: string
}

export interface CardCell {
  id: string
  card_id: string
  playlist_song_id: string
  position: number
  created_at: string
}

export interface PlayedSong {
  id: string
  game_id: string
  playlist_song_id: string
  round?: number
  played_at: string
}

export interface CardCellWithSong extends CardCell {
  playlist_song?: PlaylistSong | null
}

export type ThemeCategory = 'decade' | 'genre' | 'mood'

export interface Genre {
  id: string
  name: string
  slug: string
  sort_order: number
}

export interface Era {
  id: string
  name: string
  start_year: number
  end_year: number
  sort_order: number
}

export interface Theme {
  id: string
  name: string
  category: ThemeCategory
  description: string | null
  artwork_url: string | null
  genre_id?: string | null
  era_id?: string | null
  genre_name?: string | null
  era_name?: string | null
  created_at: string
}

export interface ThemeSong {
  id: string
  theme_id: string
  youtube_id: string
  title: string | null
  position: number
  created_at: string
}

export interface Win {
  id: string
  game_id: string
  card_id: string
  player_identifier: string | null
  mode: string | null
  round: number
  created_at: string
}

export interface MediaLibraryItem {
  id: string
  name: string
  file_path: string
  file_url: string | null
  storage_bucket: string
  file_type: 'mp3' | 'mp4' | 'spotify'
  file_size_bytes: number | null
  spotify_track_id?: string | null
  album_art_url?: string | null
  theme_id?: string | null
  created_at: string
}

export interface LeaderboardEntry {
  id: string
  player_name: string
  identifier: string
  wins: number
  points: number
  last_played: string | null
  created_at: string
  updated_at: string
}
