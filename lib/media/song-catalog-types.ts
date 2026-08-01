export type ParsedSong = {
  title: string
  artist: string | null
  year: number | null
  theme_id: string | null
  theme_name_raw?: string
  youtube_url: string | null
  start_time_sec: number
  duration_sec: number
}
