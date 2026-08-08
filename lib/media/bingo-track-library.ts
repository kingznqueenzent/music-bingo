import type { SupabaseClient } from '@supabase/supabase-js'
import { CHOICE_A_TRACKS_TABLE } from '@/types/database-extras'
import { inferTrackGenre, normalizeTrackKey, parseTitleArtist } from '@/lib/media/track-genres'
import type { Era, Genre, Theme } from '@/lib/supabase/types'

export type BingoTrackLibraryRow = {
  id: string
  game_id: string | null
  title: string
  artist: string | null
  genre: string | null
  file_url: string | null
  file_path: string | null
  theme_id: string | null
  played: boolean
  created_at: string | null
}

export const LIBRARY_TRACK_SELECT =
  'id, game_id, title, artist, genre, file_url, file_path, theme_id, played, created_at'

export async function loadLibraryTracks(supabase: SupabaseClient): Promise<{
  tracks: BingoTrackLibraryRow[]
  error?: string
}> {
  const pageSize = 1000
  const tracks: BingoTrackLibraryRow[] = []
  let page = 0

  while (true) {
    const from = page * pageSize
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from(CHOICE_A_TRACKS_TABLE)
      .select(LIBRARY_TRACK_SELECT)
      .is('game_id', null)
      .order('genre', { ascending: true })
      .order('title', { ascending: true })
      .range(from, to)

    if (error) return { tracks: [], error: error.message }
    if (!data?.length) break
    tracks.push(...(data as BingoTrackLibraryRow[]))
    if (data.length < pageSize) break
    page += 1
  }

  return { tracks }
}

/** Catalog summary for host media / parity checks (theme_songs source + library rows). */
export async function loadTrackCatalogSummary(supabase: SupabaseClient): Promise<{
  themeSongCount: number
  libraryCount: number
  error?: string
}> {
  const [{ count: themeSongCount, error: themeError }, libraryResult] = await Promise.all([
    supabase.from('theme_songs').select('*', { count: 'exact', head: true }),
    loadLibraryTracks(supabase),
  ])

  if (themeError) {
    return { themeSongCount: 0, libraryCount: 0, error: themeError.message }
  }
  if (libraryResult.error) {
    return {
      themeSongCount: themeSongCount ?? 0,
      libraryCount: 0,
      error: libraryResult.error,
    }
  }

  return {
    themeSongCount: themeSongCount ?? 0,
    libraryCount: libraryResult.tracks.length,
  }
}

export function resolveGenreForTheme(
  themeId: string | null | undefined,
  themes: Theme[],
  genres: Genre[],
  eras: Era[]
): string | null {
  if (!themeId) return null
  const theme = themes.find((t) => t.id === themeId)
  if (!theme) return null
  const parentGenre = theme.genre_id ? genres.find((g) => g.id === theme.genre_id)?.name : null
  const era = theme.era_id ? eras.find((e) => e.id === theme.era_id)?.name : null
  return inferTrackGenre({
    themeName: theme.name,
    parentGenreName: parentGenre,
    eraName: era,
  })
}

export async function dedupeLibraryTracks(supabase: SupabaseClient): Promise<{
  removed: number
  error?: string
}> {
  const { tracks, error } = await loadLibraryTracks(supabase)
  if (error) return { removed: 0, error }

  const seen = new Map<string, string>()
  const toDelete: string[] = []

  for (const track of tracks) {
    const key = normalizeTrackKey(track.title, track.artist)
    const existingId = seen.get(key)
    if (existingId) {
      toDelete.push(track.id)
    } else {
      seen.set(key, track.id)
    }
  }

  if (toDelete.length === 0) return { removed: 0 }

  const { error: deleteError } = await supabase.from(CHOICE_A_TRACKS_TABLE).delete().in('id', toDelete)
  if (deleteError) return { removed: 0, error: deleteError.message }
  return { removed: toDelete.length }
}

export async function syncMediaLibraryToTracks(
  supabase: SupabaseClient,
  themes: Theme[],
  genres: Genre[],
  eras: Era[]
): Promise<{ inserted: number; skipped: number; error?: string }> {
  const pageSize = 1000
  const mediaRows: {
    id: string
    name: string
    file_url: string | null
    file_path: string | null
    theme_id: string | null
  }[] = []
  let mediaPage = 0
  while (true) {
    const from = mediaPage * pageSize
    const to = from + pageSize - 1
    const { data, error: mediaError } = await supabase
      .from('media_library')
      .select('id, name, file_url, file_path, theme_id')
      .order('created_at', { ascending: false })
      .range(from, to)
    if (mediaError) return { inserted: 0, skipped: 0, error: mediaError.message }
    if (!data?.length) break
    mediaRows.push(...data)
    if (data.length < pageSize) break
    mediaPage += 1
  }

  const { tracks: existing } = await loadLibraryTracks(supabase)
  const existingKeys = new Set(existing.map((t) => normalizeTrackKey(t.title, t.artist)))

  let inserted = 0
  let skipped = 0

  for (const row of mediaRows) {
    const { title, artist } = parseTitleArtist(row.name)
    const key = normalizeTrackKey(title, artist)
    if (existingKeys.has(key)) {
      skipped++
      continue
    }

    const genre = resolveGenreForTheme(row.theme_id, themes, genres, eras)

    const { error: insertError } = await supabase.from(CHOICE_A_TRACKS_TABLE).insert({
      game_id: null,
      title,
      artist,
      genre,
      file_url: row.file_url,
      file_path: row.file_path,
      theme_id: row.theme_id,
      played: false,
    })

    if (insertError) {
      if (/duplicate key|unique constraint/i.test(insertError.message)) {
        skipped++
        continue
      }
      return { inserted, skipped, error: insertError.message }
    }

    existingKeys.add(key)
    inserted++
  }

  return { inserted, skipped }
}

export async function backfillMissingTrackGenres(
  supabase: SupabaseClient,
  themes: Theme[],
  genres: Genre[],
  eras: Era[]
): Promise<{ updated: number; error?: string }> {
  const { tracks, error } = await loadLibraryTracks(supabase)
  if (error) return { updated: 0, error }

  let updated = 0
  for (const track of tracks) {
    if (track.genre?.trim()) continue
    const genre = resolveGenreForTheme(track.theme_id, themes, genres, eras)
    if (!genre) continue

    const { error: updateError } = await supabase
      .from(CHOICE_A_TRACKS_TABLE)
      .update({ genre })
      .eq('id', track.id)

    if (updateError) return { updated, error: updateError.message }
    updated++
  }

  return { updated }
}

export async function importLibraryTrackLines(
  supabase: SupabaseClient,
  lines: string[],
  themeId: string | null,
  themes: Theme[],
  genres: Genre[],
  eras: Era[]
): Promise<{ inserted: number; skipped: number; error?: string }> {
  const genre = resolveGenreForTheme(themeId, themes, genres, eras)
  const { tracks: existing } = await loadLibraryTracks(supabase)
  const existingKeys = new Set(existing.map((t) => normalizeTrackKey(t.title, t.artist)))

  let inserted = 0
  let skipped = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    let title: string
    let artist: string | null
    let lineGenre = genre

    const pipe = trimmed.split('|').map((s) => s.trim())
    if (pipe.length >= 2) {
      const parsed = parseTitleArtist(pipe[0])
      title = parsed.title
      artist = parsed.artist
      if (pipe[1]) lineGenre = pipe[1]
    } else {
      const parsed = parseTitleArtist(trimmed)
      title = parsed.title
      artist = parsed.artist
    }

    const key = normalizeTrackKey(title, artist)
    if (existingKeys.has(key)) {
      skipped++
      continue
    }

    const { error: insertError } = await supabase.from(CHOICE_A_TRACKS_TABLE).insert({
      game_id: null,
      title,
      artist,
      genre: lineGenre,
      theme_id: themeId,
      played: false,
    })

    if (insertError) {
      if (/duplicate key|unique constraint/i.test(insertError.message)) {
        skipped++
        continue
      }
      return { inserted, skipped, error: insertError.message }
    }

    existingKeys.add(key)
    inserted++
  }

  return { inserted, skipped }
}
