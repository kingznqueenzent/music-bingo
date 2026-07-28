import type { SupabaseClient } from '@supabase/supabase-js'
import type { GridData } from '@/types/database-extras'
import { CHOICE_A_TRACKS_TABLE } from '@/types/database-extras'
import { generateGridFromTrackPool, minSongsForGrid } from '@/lib/bingo/cards'
import { getMaxPlayersForTier, type GameTier } from '@/lib/tiers'
import { isFeatureEnabled } from '@/lib/feature-flags'

export type GameTrackRow = {
  id: string
  title: string
  artist: string | null
  playlistSongId: string
}

export type CreatePlayerBingoCardInput = {
  gameCode: string
  username: string
  playerIdentifier?: string | null
}

export type CreatePlayerBingoCardResult =
  | {
      ok: true
      cardId: string
      gameId: string
      playerId: string
      gridData: GridData
      alreadyJoined?: boolean
    }
  | { ok: false; error: string; status?: number }

/** Copy playlist_songs into bingo_game_tracks once per game (Choice A track pool). */
export async function ensureBingoGameTracks(
  supabase: SupabaseClient,
  gameId: string,
  playlistId: string
): Promise<{ tracks: GameTrackRow[]; error?: string }> {
  const { count, error: countError } = await supabase
    .from(CHOICE_A_TRACKS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId)

  if (countError) {
    return { tracks: [], error: countError.message }
  }

  if ((count ?? 0) > 0) {
    const { data: songs, error: songsError } = await supabase
      .from('playlist_songs')
      .select('id, title')
      .eq('playlist_id', playlistId)
      .order('position')

    if (songsError) {
      return { tracks: [], error: songsError.message }
    }

    const { data: existing, error: loadError } = await supabase
      .from(CHOICE_A_TRACKS_TABLE)
      .select('id, title, artist')
      .eq('game_id', gameId)
      .order('id')

    if (loadError) {
      return { tracks: [], error: loadError.message }
    }

    const tracks: GameTrackRow[] = (existing ?? [])
      .map((t, index) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        playlistSongId: songs?.[index]?.id ?? '',
      }))
      .filter((t) => t.playlistSongId)

    return { tracks }
  }

  const { data: songs, error: songsError } = await supabase
    .from('playlist_songs')
    .select('id, title')
    .eq('playlist_id', playlistId)
    .order('position')

  if (songsError) {
    return { tracks: [], error: songsError.message }
  }

  const rows = songs ?? []
  if (rows.length === 0) {
    return { tracks: [], error: 'Playlist has no songs.' }
  }

  const tracks: GameTrackRow[] = []
  for (const song of rows) {
    const { data: inserted, error: insertError } = await supabase
      .from(CHOICE_A_TRACKS_TABLE)
      .insert({
        game_id: gameId,
        title: song.title?.trim() || 'Unknown track',
        artist: null,
        played: false,
      })
      .select('id, title, artist')
      .single()

    if (insertError || !inserted) {
      return { tracks: [], error: insertError?.message ?? 'Failed to sync bingo tracks' }
    }

    tracks.push({
      id: inserted.id,
      title: inserted.title,
      artist: inserted.artist,
      playlistSongId: song.id,
    })
  }

  return { tracks }
}

export function buildGridData(tracks: GameTrackRow[], gridSize: 4 | 5): GridData {
  const pool = tracks.map((t) => ({
    trackId: t.id,
    title: t.title,
    artist: t.artist,
    playlistSongId: t.playlistSongId,
  }))
  return generateGridFromTrackPool(pool, gridSize)
}

/** Choice A + legacy card_cells: create player, card, and jsonb grid_data. */
export async function createPlayerBingoCard(
  supabase: SupabaseClient,
  input: CreatePlayerBingoCardInput
): Promise<CreatePlayerBingoCardResult> {
  const code = input.gameCode.trim().toUpperCase()
  const username = input.username.trim()
  const identifier = input.playerIdentifier?.trim() || null

  if (!code) return { ok: false, error: 'Game code is required.', status: 400 }
  if (!username) return { ok: false, error: 'Username is required.', status: 400 }

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, playlist_id, status, grid_size, tier, entry_fee_cents')
    .eq('code', code)
    .single()

  if (gameError || !game) {
    return { ok: false, error: 'Game not found. Check the code.', status: 404 }
  }
  if (game.status === 'ended') {
    return { ok: false, error: 'This game has ended.', status: 400 }
  }

  const tier = (game.tier as GameTier) ?? 'free'
  const maxPlayers = getMaxPlayersForTier(tier)
  const { count: cardCount } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', game.id)

  const gridSize = (game.grid_size === 4 ? 4 : 5) as 4 | 5

  if (identifier) {
    const { data: existingCard } = await supabase
      .from('cards')
      .select('id, player_id')
      .eq('game_id', game.id)
      .eq('player_identifier', identifier)
      .maybeSingle()

    if (existingCard?.id) {
      return {
        ok: true,
        cardId: existingCard.id,
        gameId: game.id,
        playerId: existingCard.player_id ?? '',
        gridData: [],
        alreadyJoined: true,
      }
    }
  }

  const { data: existingPlayer } = await supabase
    .from('players')
    .select('id')
    .eq('game_id', game.id)
    .eq('username', username)
    .maybeSingle()

  if (existingPlayer?.id) {
    const { data: playerCard } = await supabase
      .from('cards')
      .select('id, grid_data')
      .eq('player_id', existingPlayer.id)
      .eq('game_id', game.id)
      .maybeSingle()

    if (playerCard?.id) {
      return {
        ok: true,
        cardId: playerCard.id,
        gameId: game.id,
        playerId: existingPlayer.id,
        gridData: (playerCard.grid_data as GridData) ?? [],
        alreadyJoined: true,
      }
    }
  } else if ((cardCount ?? 0) >= maxPlayers) {
    return {
      ok: false,
      error: `This game has reached the ${tier} tier limit (${maxPlayers} players). Upgrade to add more.`,
      status: 400,
    }
  }

  const { tracks, error: trackError } = await ensureBingoGameTracks(supabase, game.id, game.playlist_id)
  if (trackError) {
    return { ok: false, error: trackError, status: 500 }
  }

  const minSongs = minSongsForGrid(gridSize)
  if (tracks.length < minSongs) {
    return {
      ok: false,
      error: `This game does not have enough songs (need ${minSongs} for a ${gridSize}×${gridSize} grid).`,
      status: 400,
    }
  }

  let playerId = existingPlayer?.id ?? null
  if (!playerId) {
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({ game_id: game.id, username })
      .select('id')
      .single()

    if (playerError || !player) {
      return { ok: false, error: playerError?.message ?? 'Failed to register player', status: 500 }
    }
    playerId = player.id
  }

  const gridData = buildGridData(tracks, gridSize)

  const cardPayload = {
    game_id: game.id,
    player_id: playerId,
    player_name: username,
    player_identifier: identifier,
    grid_data: gridData,
    won: false,
  }

  let { data: card, error: cardError } = await supabase
    .from('cards')
    .insert(cardPayload)
    .select('id')
    .single()

  if (cardError && /player_identifier|schema cache|column.*cards/i.test(cardError.message)) {
    const retry = await supabase
      .from('cards')
      .insert({
        game_id: game.id,
        player_id: playerId,
        player_name: username,
        grid_data: gridData,
        won: false,
      })
      .select('id')
      .single()
    card = retry.data
    cardError = retry.error
  }

  if (cardError || !card) {
    return { ok: false, error: cardError?.message ?? 'Failed to create card', status: 500 }
  }

  const cellRows = gridData
    .filter((cell) => cell.playlist_song_id)
    .map((cell) => ({
      card_id: card.id,
      playlist_song_id: cell.playlist_song_id as string,
      position: cell.position,
    }))

  if (cellRows.length > 0) {
    const { error: cellsError } = await supabase.from('card_cells').insert(cellRows)
    if (cellsError) {
      await supabase.from('cards').delete().eq('id', card.id)
      return { ok: false, error: cellsError.message, status: 500 }
    }
  }

  const entryFee = Math.max(0, game.entry_fee_cents ?? 0)
  if (entryFee > 0 && (await isFeatureEnabled(supabase, 'paid_entry_games'))) {
    const { error: poolErr } = await supabase.rpc('add_to_prize_pool', {
      p_game_id: game.id,
      p_cents: entryFee,
    })
    if (poolErr) {
      console.error('[createPlayerBingoCard] add_to_prize_pool', poolErr.message)
    }
  }

  return {
    ok: true,
    cardId: card.id,
    gameId: game.id,
    playerId,
    gridData,
  }
}
