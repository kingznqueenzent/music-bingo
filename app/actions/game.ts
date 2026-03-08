'use server'

import { createClient } from '@/lib/supabase/server'
import { createGameFromThemeDirect } from '@/lib/db'
import { generateCardLayout } from '@/lib/bingo/cards'
import { getMaxPlayersForTier, type GameTier } from '@/lib/tiers'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

function generateCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

export type GameCreateOptions = {
  gridSize?: 4 | 5
  clipSeconds?: number
  crossfadeSeconds?: number
  tier?: GameTier
  logoUrl?: string | null
}

const MIN_SONGS_5X5 = 45
const MIN_SONGS_4X4 = 32

/** Host: create a playlist from YouTube URLs and start a new game */
export async function createGame(
  playlistName: string,
  youtubeUrls: string[],
  options: GameCreateOptions = {}
) {
  const supabase = createClient()
  const gridSize = options.gridSize ?? 5
  const tier = options.tier ?? 'free'
  const minSongs = gridSize === 5 ? MIN_SONGS_5X5 : MIN_SONGS_4X4

  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .insert({ name: playlistName })
    .select('id')
    .single()

  if (playlistError || !playlist) {
    return { error: playlistError?.message ?? 'Failed to create playlist' }
  }

  const raw = youtubeUrls
    .map((url) => {
      const id = extractYoutubeId(url)
      return id
        ? {
            playlist_id: playlist.id,
            source: 'youtube' as const,
            youtube_id: id,
            file_url: null,
            title: null,
          }
        : null
    })
    .filter(Boolean) as { playlist_id: string; source: 'youtube'; youtube_id: string; file_url: null; title: string | null }[]

  const songs = raw.map((s, i) => ({ ...s, position: i }))

  if (songs.length < minSongs) {
    await supabase.from('playlists').delete().eq('id', playlist.id)
    return {
      error: `Please add at least ${minSongs} YouTube links for a ${gridSize}×${gridSize} grid (got ${songs.length}).`,
    }
  }

  const { data: insertedSongs, error: songsError } = await supabase
    .from('playlist_songs')
    .insert(songs)
    .select('id, youtube_id')
  if (songsError || !insertedSongs?.length) {
    await supabase.from('playlists').delete().eq('id', playlist.id)
    return { error: songsError?.message ?? 'Failed to insert songs' }
  }

  await fillYoutubeTitles(supabase, insertedSongs)

  let code = generateCode()
  let attempts = 0
  while (attempts < 10) {
    const { data: existing } = await supabase.from('games').select('id').eq('code', code).single()
    if (!existing) break
    code = generateCode()
    attempts++
  }

  const clipSeconds = Math.min(120, Math.max(10, options.clipSeconds ?? 20))
  const crossfadeSeconds = Math.min(10, Math.max(0, options.crossfadeSeconds ?? 0))

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      playlist_id: playlist.id,
      code,
      status: 'lobby',
      grid_size: gridSize,
      clip_seconds: clipSeconds,
      crossfade_seconds: crossfadeSeconds,
      tier,
      logo_url: options.logoUrl ?? null,
    })
    .select()
    .single()

  if (gameError) {
    return { error: gameError.message }
  }
  return { game, code }
}

/** Host: create a game from Media Library (uploaded MP3/MP4) — requires Pro or Enterprise */
export async function createGameFromMediaLibrary(
  playlistName: string,
  mediaIds: string[],
  options: GameCreateOptions = {}
) {
  const supabase = createClient()
  const gridSize = options.gridSize ?? 5
  const tier = options.tier ?? 'pro'
  const minSongs = gridSize === 5 ? MIN_SONGS_5X5 : MIN_SONGS_4X4

  const uniqueIds = [...new Set(mediaIds)]
  if (uniqueIds.length < minSongs) {
    return {
      error: `Select at least ${minSongs} tracks for a ${gridSize}×${gridSize} grid (selected ${uniqueIds.length} unique).`,
    }
  }

  const { data: mediaRows, error: mediaError } = await supabase
    .from('media_library')
    .select('id, name, file_url, file_path, file_type, spotify_track_id, album_art_url')
    .in('id', uniqueIds)

  if (mediaError || !mediaRows?.length) {
    return { error: mediaError?.message ?? 'Could not load media files.' }
  }

  const byId = new Map(mediaRows.map((m) => [m.id, m]))
  const ordered = uniqueIds.map((id) => byId.get(id)).filter(Boolean) as typeof mediaRows
  if (ordered.length < minSongs) {
    return { error: `Only ${ordered.length} valid files found; need ${minSongs}.` }
  }

  const seenPaths = new Set<string>()
  const deduped = ordered.filter((m) => {
    const path = m.file_path ?? m.file_url ?? m.id
    if (seenPaths.has(path)) return false
    seenPaths.add(path)
    return true
  })
  if (deduped.length < minSongs) {
    return {
      error: `After removing duplicates, only ${deduped.length} unique tracks; need ${minSongs}.`,
    }
  }
  const songsToInsert = deduped

  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .insert({ name: playlistName })
    .select('id')
    .single()

  if (playlistError || !playlist) {
    return { error: playlistError?.message ?? 'Failed to create playlist' }
  }

  const songs = songsToInsert.map((m, index) => {
    const isSpotify = m.file_type === 'spotify' && (m as { spotify_track_id?: string }).spotify_track_id
    if (isSpotify) {
      return {
        playlist_id: playlist.id,
        source: 'spotify' as const,
        youtube_id: null,
        file_url: null,
        spotify_track_id: (m as { spotify_track_id?: string }).spotify_track_id ?? null,
        album_art_url: (m as { album_art_url?: string }).album_art_url ?? null,
        title: m.name,
        position: index,
      }
    }
    return {
      playlist_id: playlist.id,
      source: 'local' as const,
      youtube_id: null,
      file_url: m.file_url ?? null,
      title: m.name,
      position: index,
    }
  })

  const { error: songsError } = await supabase.from('playlist_songs').insert(songs)
  if (songsError) {
    await supabase.from('playlists').delete().eq('id', playlist.id)
    return { error: songsError.message }
  }

  let code = generateCode()
  let attempts = 0
  while (attempts < 10) {
    const { data: existing } = await supabase.from('games').select('id').eq('code', code).single()
    if (!existing) break
    code = generateCode()
    attempts++
  }

  const clipSeconds = Math.min(120, Math.max(10, options.clipSeconds ?? 20))
  const crossfadeSeconds = Math.min(10, Math.max(0, options.crossfadeSeconds ?? 0))

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      playlist_id: playlist.id,
      code,
      status: 'lobby',
      grid_size: gridSize,
      clip_seconds: clipSeconds,
      crossfade_seconds: crossfadeSeconds,
      tier,
      logo_url: options.logoUrl ?? null,
    })
    .select()
    .single()

  if (gameError) {
    return { error: gameError.message }
  }
  return { game, code }
}

/** Host: create a game from a saved theme (themes + theme_songs) */
export async function createGameFromTheme(themeId: string, options: GameCreateOptions = {}) {
  // When DATABASE_URL is set, use direct Postgres so "Host this theme" works even if Supabase REST has schema cache issues.
  if (process.env.DATABASE_URL) {
    const result = await createGameFromThemeDirect(themeId)
    if ('error' in result) return { error: result.error }
    return { game: result.game, code: result.code }
  }

  const supabase = createClient()

  const { data: theme, error: themeError } = await supabase
    .from('themes')
    .select('id, name')
    .eq('id', themeId)
    .single()

  if (themeError || !theme) {
    return { error: themeError?.message ?? 'Theme not found' as string }
  }

  const { data: themeSongs, error: songsError } = await supabase
    .from('theme_songs')
    .select('youtube_id, title')
    .eq('theme_id', theme.id)
    .order('position')

  if (songsError) {
    return { error: songsError.message }
  }

  if ((themeSongs ?? []).length < MIN_SONGS_5X5) {
    return { error: `Theme does not have at least ${MIN_SONGS_5X5} songs for a 5×5 grid.` }
  }

  // Reuse createGame logic by creating a playlist + playlist_songs from theme_songs
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .insert({ name: theme.name })
    .select('id')
    .single()

  if (playlistError || !playlist) {
    return { error: playlistError?.message ?? 'Failed to create playlist from theme' }
  }

  const insertSongs = (themeSongs ?? []).map((s, index) => ({
    playlist_id: playlist.id,
    source: 'youtube' as const,
    youtube_id: s.youtube_id,
    file_url: null,
    title: s.title,
    position: index,
  }))

  const { error: playlistSongsError } = await supabase.from('playlist_songs').insert(insertSongs)
  if (playlistSongsError) {
    await supabase.from('playlists').delete().eq('id', playlist.id)
    return { error: playlistSongsError.message }
  }

  let code = generateCode()
  let attempts = 0
  while (attempts < 10) {
    const { data: existing } = await supabase.from('games').select('id').eq('code', code).single()
    if (!existing) break
    code = generateCode()
    attempts++
  }

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      playlist_id: playlist.id,
      code,
      status: 'lobby',
      theme_id: theme.id,
      grid_size: 5,
      clip_seconds: 20,
      crossfade_seconds: 0,
      tier: options.tier ?? 'free',
      logo_url: options.logoUrl ?? null,
    })
    .select()
    .single()

  if (gameError) {
    return { error: gameError.message }
  }

  return { game, code }
}

/** Player: join game and get a new bingo card */
export async function joinGame(gameCode: string, playerName: string, playerIdentifier?: string) {
  const supabase = createClient()
  const code = gameCode.trim().toUpperCase()

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, playlist_id, status, grid_size, tier')
    .eq('code', code)
    .single()

  if (gameError || !game) {
    return { error: 'Game not found. Check the code.' }
  }
  if (game.status === 'ended') {
    return { error: 'This game has ended.' }
  }

  const tier = (game.tier as GameTier) ?? 'free'
  const maxPlayers = getMaxPlayersForTier(tier)
  const { count } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', game.id)
  if ((count ?? 0) >= maxPlayers) {
    return {
      error: `This game has reached the ${tier} tier limit (${maxPlayers} players). Upgrade to add more.`,
    }
  }

  const gridSize = (game.grid_size === 4 ? 4 : 5) as 4 | 5
  const cellCount = gridSize * gridSize

  const { data: songRows } = await supabase
    .from('playlist_songs')
    .select('id')
    .eq('playlist_id', game.playlist_id)
    .order('position')

  const songIds = songRows?.map((r) => r.id) ?? []
  if (songIds.length < cellCount) {
    return { error: `This game does not have enough songs (need ${cellCount}).` }
  }

  const identifier = playerIdentifier?.trim() || null
  if (identifier) {
    const { data: existing, error: existingError } = await supabase
      .from('cards')
      .select('id')
      .eq('game_id', game.id)
      .eq('player_identifier', identifier)
      .single()
    if (!existingError && existing) {
      return { cardId: existing.id, gameId: game.id, alreadyJoined: true }
    }
  }

  const layout = generateCardLayout(songIds, gridSize)
  const insertPayload: { game_id: string; player_name: string; player_identifier?: string | null } = {
    game_id: game.id,
    player_name: playerName,
    player_identifier: identifier,
  }
  let { data: card, error: cardError } = await supabase
    .from('cards')
    .insert(insertPayload)
    .select('id')
    .single()

  if (cardError && /player_identifier|schema cache|column.*cards/i.test(cardError.message)) {
    delete insertPayload.player_identifier
    const retry = await supabase.from('cards').insert(insertPayload).select('id').single()
    card = retry.data
    cardError = retry.error
  }

  if (cardError || !card) {
    return { error: cardError?.message ?? 'Failed to create card' }
  }

  const { error: cellsError } = await supabase.from('card_cells').insert(
    layout.map(({ position, playlistSongId }) => ({
      card_id: card.id,
      playlist_song_id: playlistSongId,
      position,
    }))
  )
  if (cellsError) {
    await supabase.from('cards').delete().eq('id', card.id)
    return { error: cellsError.message }
  }

  return { cardId: card.id, gameId: game.id }
}

/** Host: advance to next song and record it as played */
export async function playNextSong(gameId: string, playlistSongId: string) {
  const supabase = createClient()
  const { error: playedError } = await supabase.from('played_songs').insert({
    game_id: gameId,
    playlist_song_id: playlistSongId,
  })
  if (playedError) {
    const msg = [playedError.message, playedError.details, playedError.hint].filter(Boolean).join(' ')
    return { error: msg || playedError.message }
  }
  const { error: updateError } = await supabase
    .from('games')
    .update({ current_song_id: playlistSongId, status: 'playing' })
    .eq('id', gameId)
  if (updateError) {
    const msg = [updateError.message, updateError.details, updateError.hint].filter(Boolean).join(' ')
    return { error: msg || updateError.message }
  }
  return { ok: true }
}

/** Host: start game (set status to playing without a current song yet) */
export async function startGame(gameId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('games').update({ status: 'playing' }).eq('id', gameId)
  if (error) return { error: error.message }
  return { ok: true }
}

export type WinPattern = 'line' | 'x' | 'blackout'

/** Host: update clip length, crossfade, logo (Enterprise), winning pattern, and stage leaderboard toggle */
export async function updateGameSettings(
  gameId: string,
  settings: {
    clipSeconds?: number
    crossfadeSeconds?: number
    logoUrl?: string | null
    winPattern?: WinPattern
    stageShowLeaderboard?: boolean
  }
) {
  const supabase = createClient()
  const updates: {
    clip_seconds?: number
    crossfade_seconds?: number
    logo_url?: string | null
    mode?: string
    stage_show_leaderboard?: boolean
  } = {}
  if (settings.clipSeconds != null)
    updates.clip_seconds = Math.min(120, Math.max(10, settings.clipSeconds))
  if (settings.crossfadeSeconds != null)
    updates.crossfade_seconds = Math.min(10, Math.max(0, settings.crossfadeSeconds))
  if (settings.logoUrl !== undefined) updates.logo_url = settings.logoUrl || null
  if (settings.winPattern != null && ['line', 'x', 'blackout'].includes(settings.winPattern))
    updates.mode = settings.winPattern
  if (settings.stageShowLeaderboard !== undefined)
    updates.stage_show_leaderboard = settings.stageShowLeaderboard
  if (Object.keys(updates).length === 0) return { ok: true }
  const { error } = await supabase.from('games').update(updates).eq('id', gameId)
  if (error) return { error: error.message }
  return { ok: true }
}

export type CardCellVerification = {
  position: number
  playlistSongId: string
  title: string | null
  played: boolean
}

/** Host: fetch a card by ID for Master Board verification (highlight played songs) */
export async function getCardForVerification(
  cardId: string,
  gameId: string
): Promise<
  | { card: { id: string; player_name: string; player_identifier: string | null }; cells: CardCellVerification[] }
  | { error: string }
> {
  const supabase = createClient()
  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('id, player_name, player_identifier')
    .eq('id', cardId)
    .eq('game_id', gameId)
    .single()
  if (cardError || !card) return { error: 'Card not found' }

  const { data: cells, error: cellsError } = await supabase
    .from('card_cells')
    .select('position, playlist_song_id')
    .eq('card_id', cardId)
    .order('position')
  if (cellsError || !cells?.length) return { error: 'Could not load card cells' }

  const { data: played } = await supabase
    .from('played_songs')
    .select('playlist_song_id')
    .eq('game_id', gameId)
  const playedSet = new Set(played?.map((p) => p.playlist_song_id) ?? [])

  const songIds = [...new Set(cells.map((c) => c.playlist_song_id))]
  const { data: songs } = await supabase
    .from('playlist_songs')
    .select('id, title, youtube_id, spotify_track_id')
    .in('id', songIds)
  const songMap = new Map(
    (songs ?? []).map((s) => [
      s.id,
      s.title || s.youtube_id || (s as { spotify_track_id?: string }).spotify_track_id || '',
    ])
  )

  const cellList: CardCellVerification[] = cells.map((c) => ({
    position: c.position,
    playlistSongId: c.playlist_song_id,
    title: songMap.get(c.playlist_song_id) ?? null,
    played: playedSet.has(c.playlist_song_id),
  }))
  return { card, cells: cellList }
}

export type CardForPdf = {
  cardId: string
  playerName: string
  gridSize: number
  cells: { position: number; label: string }[]
}

/** Host: fetch all cards for a game for PDF export (Print Mode) */
export async function getCardsForPdf(
  gameId: string
): Promise<{ gameCode: string; logoUrl: string | null; cards: CardForPdf[] } | { error: string }> {
  const supabase = createClient()
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('code, grid_size, logo_url')
    .eq('id', gameId)
    .single()
  if (gameError || !game) return { error: 'Game not found' }

  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('id, player_name')
    .eq('game_id', gameId)
    .order('player_name')
  if (cardsError || !cards?.length) return { gameCode: game.code, logoUrl: game.logo_url ?? null, cards: [] }

  const gridSize = game.grid_size === 4 ? 4 : 5
  const result: CardForPdf[] = []

  for (const card of cards) {
    const { data: cells } = await supabase
      .from('card_cells')
      .select('position, playlist_song_id')
      .eq('card_id', card.id)
      .order('position')
    const songIds = [...new Set((cells ?? []).map((c) => c.playlist_song_id))]
    const { data: songs } = await supabase
      .from('playlist_songs')
      .select('id, title, youtube_id, spotify_track_id')
      .in('id', songIds)
    const songMap = new Map(
      (songs ?? []).map((s) => [
        s.id,
        (s.title || s.youtube_id || (s as { spotify_track_id?: string }).spotify_track_id || '—').slice(0, 30),
      ])
    )
    result.push({
      cardId: card.id,
      playerName: card.player_name,
      gridSize,
      cells: (cells ?? []).sort((a, b) => a.position - b.position).map((c) => ({
        position: c.position,
        label: songMap.get(c.playlist_song_id) ?? '—',
      })),
    })
  }
  return { gameCode: game.code, logoUrl: game.logo_url ?? null, cards: result }
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

/** Fetch YouTube video titles via noembed (no API key) and update playlist_songs */
async function fillYoutubeTitles(
  supabase: ReturnType<typeof createClient>,
  rows: { id: string; youtube_id: string }[]
) {
  const BATCH = 8
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map(async (row) => {
        try {
          const res = await fetch(
            `https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${row.youtube_id}`)}`,
            { signal: AbortSignal.timeout(5000) }
          )
          const data = (await res.json()) as { title?: string }
          return { id: row.id, title: data?.title ?? null }
        } catch {
          return { id: row.id, title: null }
        }
      })
    )
    for (const { id, title } of results) {
      if (title) await supabase.from('playlist_songs').update({ title }).eq('id', id)
    }
  }
}
