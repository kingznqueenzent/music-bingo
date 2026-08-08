import type { SupabaseClient } from '@supabase/supabase-js'

export type CatalogSongListItem = {
  id: string
  title: string
  artist: string | null
  media_url: string | null
  youtube_url: string | null
  media_type: string
  theme_id: string | null
}

const SONG_LIST_SELECT =
  'id, title, artist, media_url, youtube_url, media_type, theme_id'

/** Fetch every public.songs row (Supabase caps each response at ~1000). */
export async function fetchAllCatalogSongs(
  supabase: SupabaseClient,
  select: string = SONG_LIST_SELECT
): Promise<{ songs: CatalogSongListItem[]; error?: string }> {
  const pageSize = 1000
  const songs: CatalogSongListItem[] = []
  let page = 0

  while (true) {
    const from = page * pageSize
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('songs')
      .select(select)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) return { songs: [], error: error.message }
    if (!data?.length) break
    songs.push(...(data as unknown as CatalogSongListItem[]))
    if (data.length < pageSize) break
    page += 1
  }

  return { songs }
}

export function songHasPlayableSource(song: {
  media_url?: string | null
  youtube_url?: string | null
}): boolean {
  return Boolean(song.media_url?.trim() || song.youtube_url?.trim())
}
