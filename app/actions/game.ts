'use server'

import { createClient } from '@/lib/supabase/server'
import { createGameFromThemeDirect } from '@/lib/db'
import { generateCardLayout, minSongsForGrid, shuffleArray } from '@/lib/bingo/cards'
import type { GameTier } from '@/lib/tiers'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { insertGameOrReuseLobby, roomCodeLookupFilter } from '@/lib/game-room-code'
import {
  checkMediaLibraryAccessForClient,
  mediaLibraryBlockedMessage,
} from '@/lib/media/media-library-access-server'
import { startGameSession } from '@/lib/game-start'
import { roomCodeFromGame } from '@/types/database-extras'
import { fillYoutubeTitles } from '@/lib/youtube-titles'
import { normalizeWinPattern, type WinPattern } from '@/lib/bingo-win-pattern'

export type GameCreateOptions = {
  gridSize?: 4 | 5
  clipSeconds?: number
  crossfadeSeconds?: number
  tier?: GameTier
  logoUrl?: string | null
  /** When true, randomize playlist_songs position order before dealing cards. */
  randomShuffle?: boolean
  /** Winning pattern stored as `games.mode` (defaults to line). */
  winPattern?: WinPattern
}

const MIN_SONGS_5X5 = 45
const MIN_SONGS_4X4 = 32

/** Host: create a playlist from YouTube URLs and start a new game */
export async function createGame(
  playlistName: string,
  youtubeUrls: string[],
  options: GameCreateOptions = {}
) {
  try {
    console.log('[createGame] Creating game with tracks:', {
      count: youtubeUrls.length,
      name: playlistName,
      gridSize: options.gridSize ?? 5,
      tier: options.tier ?? 'free',
    })

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
      console.error('[createGame] playlist insert failed:', playlistError)
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
      .filter(Boolean) as {
      playlist_id: string
      source: 'youtube'
      youtube_id: string
      file_url: null
      title: string | null
    }[]

    const orderedRaw = options.randomShuffle ? shuffleArray(raw) : raw
    const songs = orderedRaw.map((s, i) => ({ ...s, position: i }))

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
      console.error('[createGame] playlist_songs insert failed:', songsError)
      await supabase.from('playlists').delete().eq('id', playlist.id)
      return { error: songsError?.message ?? 'Failed to insert songs' }
    }

    // Resolve YouTube titles in the background — do not block room creation on noembed latency.
    void fillYoutubeTitles(supabase, insertedSongs).catch(() => {})

    const clipSeconds = Math.min(120, Math.max(10, options.clipSeconds ?? 20))
    const crossfadeSeconds = Math.min(10, Math.max(0, options.crossfadeSeconds ?? 0))

    const roomResult = await insertGameOrReuseLobby(supabase, {
      playlist_id: playlist.id,
      status: 'lobby',
      grid_size: gridSize,
      clip_seconds: clipSeconds,
      crossfade_seconds: crossfadeSeconds,
      tier,
      logo_url: options.logoUrl ?? null,
      mode: normalizeWinPattern(options.winPattern),
    })

    if (roomResult.error) {
      console.error('[createGame] room insert failed:', roomResult.error)
      return { error: roomResult.error }
    }
    console.log('[createGame] ok', { gameId: roomResult.game?.id, code: roomResult.code })
    return { game: roomResult.game, code: roomResult.code, reused: roomResult.reused }
  } catch (err) {
    console.error('[createGame] unexpected error:', err)
    return { error: err instanceof Error ? err.message : 'Could not create game.' }
  }
}

type CatalogSongRow = {
  id: string
  title: string
  artist: string | null
  media_url: string | null
  youtube_url: string | null
  media_type: string
}

async function fetchSongsByIds(
  supabase: ReturnType<typeof createClient>,
  ids: string[]
): Promise<{ rows: CatalogSongRow[]; error?: string }> {
  const CHUNK = 100
  const rows: CatalogSongRow[] = []
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from('songs')
      .select('id, title, artist, media_url, youtube_url, media_type')
      .in('id', chunk)
    if (error) return { rows: [], error: error.message }
    if (data?.length) rows.push(...(data as CatalogSongRow[]))
  }
  return { rows }
}

/**
 * Host: create a game from the songs catalog (`public.songs`).
 * Accepts catalog song IDs (Media Manager / create-from-media). Pro+ recommended for local media.
 */
export async function createGameFromMediaLibrary(
  playlistName: string,
  songIds: string[],
  options: GameCreateOptions = {}
) {
  try {
    console.log('[createGameFromMediaLibrary] Creating game with tracks:', {
      count: songIds.length,
      name: playlistName,
      gridSize: options.gridSize ?? 5,
      tier: options.tier ?? 'pro',
    })

    const supabase = createClient()
    const access = await checkMediaLibraryAccessForClient(supabase)
    if (!access.allowed) {
      return { error: mediaLibraryBlockedMessage() }
    }

    const gridSize = options.gridSize ?? 5
    const tier = options.tier ?? 'pro'
    const minSongs = gridSize === 5 ? MIN_SONGS_5X5 : MIN_SONGS_4X4

    const uniqueIds = [...new Set(songIds)]
    if (uniqueIds.length < minSongs) {
      return {
        error: `Select at least ${minSongs} tracks for a ${gridSize}×${gridSize} grid (selected ${uniqueIds.length} unique).`,
      }
    }

    const { rows: catalogRows, error: catalogError } = await fetchSongsByIds(supabase, uniqueIds)
    if (catalogError || !catalogRows.length) {
      console.error('[createGameFromMediaLibrary] catalog load failed:', catalogError)
      return { error: catalogError ?? 'Could not load catalog tracks.' }
    }

    const byId = new Map(catalogRows.map((s) => [s.id, s]))
    const ordered = uniqueIds.map((id) => byId.get(id)).filter(Boolean) as CatalogSongRow[]

    const seenKeys = new Set<string>()
    const playable = ordered.filter((s) => {
      const mediaUrl = s.media_url?.trim() || null
      const youtubeUrl = s.youtube_url?.trim() || null
      if (!mediaUrl && !youtubeUrl) return false
      const key = `${(s.title || '').toLowerCase()}|${(s.artist || '').toLowerCase()}|${mediaUrl || youtubeUrl}`
      if (seenKeys.has(key)) return false
      seenKeys.add(key)
      return true
    })

    if (playable.length < minSongs) {
      return {
        error: `Only ${playable.length} playable tracks (with media or YouTube URL) after filtering; need ${minSongs}.`,
      }
    }

    const queue = options.randomShuffle ? shuffleArray(playable) : playable

    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .insert({ name: playlistName })
      .select('id')
      .single()

    if (playlistError || !playlist) {
      console.error('[createGameFromMediaLibrary] playlist insert failed:', playlistError)
      return { error: playlistError?.message ?? 'Failed to create playlist' }
    }

    const songs = queue.map((s, index) => {
      const youtubeId = s.youtube_url ? extractYoutubeId(s.youtube_url) : null
      const mediaUrl = s.media_url?.trim() || null
      const title = s.artist ? `${s.title} — ${s.artist}` : s.title
      if (youtubeId && !mediaUrl) {
        return {
          playlist_id: playlist.id,
          source: 'youtube' as const,
          youtube_id: youtubeId,
          file_url: null,
          audio_url: null,
          title,
          position: index,
        }
      }
      return {
        playlist_id: playlist.id,
        source: 'local' as const,
        youtube_id: youtubeId,
        file_url: mediaUrl,
        audio_url: mediaUrl,
        title,
        position: index,
      }
    })

    const { error: songsError } = await supabase.from('playlist_songs').insert(songs)
    if (songsError) {
      console.error('[createGameFromMediaLibrary] songs insert failed:', songsError)
      await supabase.from('playlists').delete().eq('id', playlist.id)
      return { error: songsError.message }
    }

    const clipSeconds = Math.min(120, Math.max(10, options.clipSeconds ?? 20))
    const crossfadeSeconds = Math.min(10, Math.max(0, options.crossfadeSeconds ?? 0))

    const roomResult = await insertGameOrReuseLobby(supabase, {
      playlist_id: playlist.id,
      status: 'lobby',
      grid_size: gridSize,
      clip_seconds: clipSeconds,
      crossfade_seconds: crossfadeSeconds,
      tier,
      logo_url: options.logoUrl ?? null,
      mode: normalizeWinPattern(options.winPattern),
    })

    if (roomResult.error) {
      console.error('[createGameFromMediaLibrary] room insert failed:', roomResult.error)
      return { error: roomResult.error }
    }
    console.log('[createGameFromMediaLibrary] ok', {
      gameId: roomResult.game?.id,
      code: roomResult.code,
    })
    return { game: roomResult.game, code: roomResult.code, reused: roomResult.reused }
  } catch (err) {
    console.error('[createGameFromMediaLibrary] unexpected error:', err)
    return { error: err instanceof Error ? err.message : 'Could not create game.' }
  }
}

/** Host: create a game from a saved theme (themes + theme_songs) */
export async function createGameFromTheme(themeId: string, options: GameCreateOptions = {}) {
  // When DATABASE_URL is set, use direct Postgres so "Host this theme" works even if Supabase REST has schema cache issues.
  if (process.env.DATABASE_URL) {
    const result = await createGameFromThemeDirect(themeId, {
      randomShuffle: options.randomShuffle,
      winPattern: normalizeWinPattern(options.winPattern),
    })
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
    .select('youtube_id, title, audio_url, start_time')
    .eq('theme_id', theme.id)
    .order('position')

  if (songsError) {
    return { error: songsError.message }
  }

  if ((themeSongs ?? []).length < MIN_SONGS_5X5) {
    return { error: `Theme does not have at least ${MIN_SONGS_5X5} songs for a 5×5 grid.` }
  }

  const themeSongRows = themeSongs ?? []
  const queue = options.randomShuffle ? shuffleArray(themeSongRows) : themeSongRows

  // Reuse createGame logic by creating a playlist + playlist_songs from theme_songs
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .insert({ name: theme.name })
    .select('id')
    .single()

  if (playlistError || !playlist) {
    return { error: playlistError?.message ?? 'Failed to create playlist from theme' }
  }

  const insertSongs = queue.map((s, index) => {
    const hasMp3 = !!s.audio_url?.trim()
    return {
      playlist_id: playlist.id,
      source: hasMp3 ? ('local' as const) : ('youtube' as const),
      youtube_id: s.youtube_id,
      audio_url: s.audio_url ?? null,
      start_time: s.start_time ?? 0,
      file_url: null,
      title: s.title,
      position: index,
    }
  })

  const { error: playlistSongsError } = await supabase.from('playlist_songs').insert(insertSongs)
  if (playlistSongsError) {
    await supabase.from('playlists').delete().eq('id', playlist.id)
    return { error: playlistSongsError.message }
  }

  const { data: insertedPs } = await supabase
    .from('playlist_songs')
    .select('id, youtube_id')
    .eq('playlist_id', playlist.id)
    .is('title', null)
  if (insertedPs?.length) {
    void fillYoutubeTitles(
      supabase,
      insertedPs.filter((r) => r.youtube_id) as { id: string; youtube_id: string }[]
    ).catch(() => {})
  }

  const roomResult = await insertGameOrReuseLobby(supabase, {
    playlist_id: playlist.id,
    status: 'lobby',
    theme_id: theme.id,
    grid_size: 5,
    clip_seconds: 20,
    crossfade_seconds: 0,
    tier: options.tier ?? 'free',
    logo_url: options.logoUrl ?? null,
    mode: normalizeWinPattern(options.winPattern),
  })

  if (roomResult.error) {
    return { error: roomResult.error }
  }
  return { game: roomResult.game, code: roomResult.code, reused: roomResult.reused }
}

/** Player: join game and get a new bingo card */
export async function joinGame(gameCode: string, playerName: string, playerIdentifier?: string) {
  const supabase = createClient()
  const code = gameCode.trim().toUpperCase()

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, playlist_id, status, grid_size, tier, entry_fee_cents')
    .or(roomCodeLookupFilter(code))
    .single()

  if (gameError || !game) {
    return { error: 'Game not found. Check the code.' }
  }
  if (game.status === 'ended') {
    return { error: 'This game has ended.' }
  }

  const gridSize = (game.grid_size === 4 ? 4 : 5) as 4 | 5

  const { data: songRows } = await supabase
    .from('playlist_songs')
    .select('id')
    .eq('playlist_id', game.playlist_id)
    .order('position')

  const songIds = songRows?.map((r) => r.id) ?? []
  const minSongs = minSongsForGrid(gridSize)
  if (songIds.length < minSongs) {
    return { error: `This game does not have enough songs (need ${minSongs} for a ${gridSize}×${gridSize} grid).` }
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

  const entryFee = Math.max(0, game.entry_fee_cents ?? 0)
  if (entryFee > 0 && (await isFeatureEnabled(supabase, 'paid_entry_games'))) {
    const { error: poolErr } = await supabase.rpc('add_to_prize_pool', {
      p_game_id: game.id,
      p_cents: entryFee,
    })
    if (poolErr) {
      console.error('[joinGame] add_to_prize_pool', poolErr.message)
    }
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

/** Host: start game — validate playlist, call first random unplayed track, set playing. */
export async function startGame(gameId: string) {
  try {
    const supabase = createClient()
    const result = await startGameSession(supabase, gameId)
    if (!result.ok) return { error: result.error }
    return { ok: true as const, playlistSongId: result.playlistSongId }
  } catch (e) {
    console.error('[startGame]', e)
    return { error: e instanceof Error ? e.message : 'Could not start game.' }
  }
}

/** Host: update clip length, crossfade, logo (Enterprise), winning pattern, and stage leaderboard toggle */
export async function updateGameSettings(
  gameId: string,
  settings: {
    clipSeconds?: number
    crossfadeSeconds?: number
    autoPlayEnabled?: boolean
    gamePaceSeconds?: number
    logoUrl?: string | null
    winPattern?: WinPattern
    stageShowLeaderboard?: boolean
    hideSongTitles?: boolean
    venueDisplayName?: string | null
    brandPrimaryHex?: string | null
    brandAccentHex?: string | null
    brandHideLyricgrid?: boolean
    entryFeeCents?: number | null
    mutedPlayers?: string[] | null
    chatProfanityFilterEnabled?: boolean
  }
) {
  const supabase = createClient()
  const updates: {
    clip_seconds?: number
    crossfade_seconds?: number
    auto_play_enabled?: boolean
    game_pace_seconds?: number
    logo_url?: string | null
    mode?: string
    stage_show_leaderboard?: boolean
    hide_song_titles?: boolean
    venue_display_name?: string | null
    brand_primary_hex?: string | null
    brand_accent_hex?: string | null
    brand_hide_lyricgrid?: boolean
    entry_fee_cents?: number
    muted_players?: string[]
    chat_profanity_filter_enabled?: boolean
  } = {}
  if (settings.clipSeconds != null)
    updates.clip_seconds = Math.min(120, Math.max(10, settings.clipSeconds))
  if (settings.crossfadeSeconds != null)
    updates.crossfade_seconds = Math.min(10, Math.max(0, settings.crossfadeSeconds))
  if (settings.autoPlayEnabled !== undefined) updates.auto_play_enabled = settings.autoPlayEnabled
  if (settings.gamePaceSeconds != null)
    updates.game_pace_seconds = Math.min(120, Math.max(3, settings.gamePaceSeconds))
  if (settings.logoUrl !== undefined) updates.logo_url = settings.logoUrl || null
  if (settings.winPattern != null && ['line', 'x', 'blackout', 'corners'].includes(settings.winPattern))
    updates.mode = settings.winPattern
  if (settings.stageShowLeaderboard !== undefined)
    updates.stage_show_leaderboard = settings.stageShowLeaderboard
  if (settings.hideSongTitles !== undefined) updates.hide_song_titles = settings.hideSongTitles
  if (settings.venueDisplayName !== undefined) updates.venue_display_name = settings.venueDisplayName?.trim() || null
  if (settings.brandPrimaryHex !== undefined) updates.brand_primary_hex = settings.brandPrimaryHex?.trim() || null
  if (settings.brandAccentHex !== undefined) updates.brand_accent_hex = settings.brandAccentHex?.trim() || null
  if (settings.brandHideLyricgrid !== undefined) updates.brand_hide_lyricgrid = settings.brandHideLyricgrid
  if (settings.entryFeeCents != null) {
    updates.entry_fee_cents = Math.min(1_000_000, Math.max(0, Math.floor(settings.entryFeeCents)))
  }
  if (settings.mutedPlayers !== undefined) {
    updates.muted_players = settings.mutedPlayers?.map((s) => s.trim().toLowerCase()).filter(Boolean) ?? []
  }
  if (settings.chatProfanityFilterEnabled !== undefined) {
    updates.chat_profanity_filter_enabled = settings.chatProfanityFilterEnabled
  }
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
    .select('id, title, youtube_id')
    .in('id', songIds)
  const songMap = new Map((songs ?? []).map((s) => [s.id, s.title || s.youtube_id || '']))

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
    .select('code, room_code, grid_size, logo_url')
    .eq('id', gameId)
    .single()
  if (gameError || !game) return { error: 'Game not found' }

  const resolvedCode = roomCodeFromGame(game)

  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('id, player_name')
    .eq('game_id', gameId)
    .order('player_name')
  if (cardsError || !cards?.length) return { gameCode: resolvedCode, logoUrl: game.logo_url ?? null, cards: [] }

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
      .select('id, title, youtube_id')
      .in('id', songIds)
    const songMap = new Map(
      (songs ?? []).map((s) => [s.id, (s.title || s.youtube_id || '—').slice(0, 30)])
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
  return { gameCode: resolvedCode, logoUrl: game.logo_url ?? null, cards: result }
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
