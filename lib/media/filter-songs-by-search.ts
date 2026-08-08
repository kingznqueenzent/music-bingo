import type { CatalogSong } from '@/app/media-manager/types'

/** Lowercased haystack for fast repeated search filtering. */
export function buildSongSearchHaystack(
  song: CatalogSong,
  themeNameById: Map<string, string>
): string {
  const theme = song.theme_id ? themeNameById.get(song.theme_id) ?? '' : ''
  return [
    song.title ?? '',
    song.artist ?? '',
    theme,
    song.media_url ?? '',
    song.youtube_url ?? '',
    song.storage_path ?? '',
  ]
    .join(' ')
    .toLowerCase()
}

/** Search filter — title, artist, theme name, and audio / YouTube URL. */
export function filterSongsBySearchQuery(
  songs: CatalogSong[],
  themeNameById: Map<string, string>,
  searchQuery: string,
  haystackById?: Map<string, string>
): CatalogSong[] {
  const query = searchQuery.trim().toLowerCase()
  if (!query) return songs

  return songs.filter((song) => {
    const haystack =
      haystackById?.get(song.id) ?? buildSongSearchHaystack(song, themeNameById)
    return haystack.includes(query)
  })
}
