import type { CatalogSong } from '@/app/media-manager/types'

/** Search filter — title, artist, theme name, and audio / YouTube URL. */
export function filterSongsBySearchQuery(
  songs: CatalogSong[],
  themeNameById: Map<string, string>,
  searchQuery: string
): CatalogSong[] {
  const query = searchQuery.trim().toLowerCase()
  if (!query) return songs

  return songs.filter((song) => {
    const theme = song.theme_id ? themeNameById.get(song.theme_id) ?? '' : ''
    const audioUrl = song.media_url ?? song.youtube_url ?? ''
    return (
      song.title?.toLowerCase().includes(query) ||
      (song.artist ?? '').toLowerCase().includes(query) ||
      theme.toLowerCase().includes(query) ||
      audioUrl.toLowerCase().includes(query)
    )
  })
}
