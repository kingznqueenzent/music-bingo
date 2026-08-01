export type CatalogTheme = {
  id: string
  name: string
  display_order: number
}

export type CatalogSong = {
  id: string
  title: string
  artist: string | null
  year: number | null
  theme_id: string | null
  media_type: string
  media_url: string | null
  storage_path?: string | null
  youtube_url: string | null
  start_time_sec: number
  duration_sec: number
  file_duration_sec?: number | null
}

export type SongUpdatePayload = {
  title: string
  artist: string | null
  year: number | null
  theme_id: string | null
  media_url: string | null
  storage_path?: string | null
  youtube_url: string | null
  start_time_sec: number
  duration_sec: number
  file_duration_sec?: number | null
  media_type: string
}

export type SongInsertPayload = {
  title: string
  artist: string | null
  year: number | null
  theme_id: string | null
  media_url: string
  storage_path: string
  media_type: 'audio' | 'video'
  start_time_sec: number
  duration_sec: number
  file_duration_sec: number | null
}
