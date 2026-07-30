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
  audio_url?: string | null
  start_time?: number | null
  spotify_track_id?: string | null
  album_art_url?: string | null
  title: string | null
  position: number
  created_at: string
}

export type GameTier = 'free' | 'pro' | 'enterprise'

export type WheelSegment = {
  label: string
  color?: string
  weight?: number
}

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
  venue_display_name?: string | null
  brand_primary_hex?: string | null
  brand_accent_hex?: string | null
  brand_hide_lyricgrid?: boolean
  entry_fee_cents?: number
  prize_pool_cents?: number
  wheel_segments?: WheelSegment[] | null
  muted_players?: string[]
  chat_profanity_filter_enabled?: boolean
  created_at: string
}

export type ChatRoom = 'lobby' | 'ingame' | 'community' | 'tournament'
export type ChatMessageType = 'text' | 'reaction' | 'system'
export type CommunityChannel = 'general' | 'dancehall' | 'hiphop' | '90s' | 'throwbacks'

export type ChatSenderRole = 'player' | 'host'

export interface PlayerProfile {
  id: string
  email?: string | null
  display_name?: string | null
  role?: string | null
  is_admin?: boolean | null
  created_at?: string
}

export interface ChatMessage {
  id: string
  game_id: string | null
  player_name: string
  player_email: string
  player_identifier: string | null
  avatar_url: string | null
  message: string
  message_type: ChatMessageType
  room: ChatRoom
  community_channel: CommunityChannel | null
  tournament_id: string | null
  is_flagged: boolean
  is_deleted: boolean
  sender_role?: ChatSenderRole
  /** API GET maps sender_role for clients (alias) */
  role?: ChatSenderRole
  /** Supabase admin DJ messages */
  is_dj?: boolean
  /** API GET camelCase alias for is_dj */
  isDJ?: boolean
  created_at: string
}

export interface GameSponsor {
  id: string
  game_id: string
  name: string
  logo_url: string | null
  sort_order: number
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
  artist?: string | null
  theme_tag?: string | null
  audio_url?: string | null
  start_time?: number | null
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

import type { BingoTrackLibraryRow } from '@/lib/media/bingo-track-library'

export type { BingoTrackLibraryRow }

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

export type TournamentStatus = 'upcoming' | 'active' | 'completed'
export type TournamentFormat = 'points' | 'bracket'

export interface Tournament {
  id: string
  name: string
  status: TournamentStatus
  start_date: string
  end_date: string
  theme_ids: string[] | null
  format: TournamentFormat
  rounds_total: number
  prize_description: string | null
  banner_url: string | null
  max_players: number | null
  winner_bonus_xp?: number
  created_at?: string
  updated_at?: string
}

export interface TournamentEntry {
  id: string
  tournament_id: string
  player_email: string
  player_name: string
  player_identifier: string
  points: number
  rounds_played: number
  rank: number | null
  is_eliminated: boolean
  attendance_bonus_applied?: boolean
  created_at?: string
  updated_at?: string
}

export interface FeatureFlag {
  key: string
  label: string
  enabled: boolean
  description: string
}

/** Logistical prize claim (triggers email via Database Webhook → /api/webhooks/claimed-prize) */
export interface ClaimedPrize {
  id: string
  winner_name: string
  prize_id: string
  claim_email: string
  claim_phone: string | null
  game_id: string
  claimed_at: string
  created_at: string
}

export interface LeaderboardEntry {
  id: string
  player_name: string
  identifier: string
  wins: number
  /** Lifetime XP (mirrors total_xp; kept for legacy UI) */
  points: number
  total_xp?: number
  games_played?: number
  streak_current?: number
  streak_best?: number
  premium_subscriber?: boolean
  chat_messages_sent?: number
  chat_distinct_days?: number
  last_chat_date?: string | null
  last_played_week?: string | null
  badges?: string[] | null
  last_played: string | null
  created_at: string
  updated_at: string
}
