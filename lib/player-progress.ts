import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeWinPattern, type WinPattern } from '@/lib/bingo-win-pattern'
import { getISOWeekString, isConsecutiveISOWeek } from '@/lib/iso-week'
import { getLevelFromXp } from '@/lib/xp-levels'
import { evaluateNewBadges } from '@/lib/badge-definitions'
import { applyTournamentParticipation, applyTournamentWinClaim } from '@/lib/tournament-points'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { incrementPlayerStats } from '@/lib/player-stats'

const XP_PLAY_GAME = 10
const XP_PER_CORRECT_MARK = 2
const XP_WIN_BASE = 50
const XP_WIN_X_BONUS = 75
/** +10% of base XP per week of streak, capped at 10 weeks for multiplier */
function streakMultiplierBonus(baseBeforeStreak: number, streakForMult: number): number {
  const w = Math.min(Math.max(streakForMult, 0), 10)
  return Math.floor(baseBeforeStreak * 0.1 * w)
}

export type ProgressApplyResult =
  | {
      ok: true
      xpGained: number
      breakdown: { play: number; marks: number; win: number; xBonus: number; streakMult: number }
      newBadges: string[]
    }
  | { ok: false; error: string }

async function countCorrectMarks(
  supabase: SupabaseClient,
  gameId: string,
  cardId: string
): Promise<number> {
  const { data: cells } = await supabase.from('card_cells').select('playlist_song_id').eq('card_id', cardId)
  if (!cells?.length) return 0
  const { data: played } = await supabase.from('played_songs').select('playlist_song_id').eq('game_id', gameId)
  const playedSet = new Set((played ?? []).map((p) => p.playlist_song_id))
  return cells.filter((c) => playedSet.has(c.playlist_song_id)).length
}

function nextStreakState(
  lastWeek: string | null | undefined,
  streakCurrent: number,
  streakBest: number,
  nowWeek: string
): { streakCurrent: number; streakBest: number; lastPlayedWeek: string } {
  if (!lastWeek || lastWeek === '') {
    return { streakCurrent: 1, streakBest: Math.max(streakBest, 1), lastPlayedWeek: nowWeek }
  }
  if (lastWeek === nowWeek) {
    return { streakCurrent, streakBest, lastPlayedWeek: nowWeek }
  }
  if (isConsecutiveISOWeek(lastWeek, nowWeek)) {
    const next = streakCurrent + 1
    return { streakCurrent: next, streakBest: Math.max(streakBest, next), lastPlayedWeek: nowWeek }
  }
  return { streakCurrent: 1, streakBest: Math.max(streakBest, 1), lastPlayedWeek: nowWeek }
}

async function upsertLeaderboardProgress(
  supabase: SupabaseClient,
  identifier: string,
  playerName: string,
  delta: {
    xp: number
    gamesPlayed: number
    wins: number
    streakCurrent: number
    streakBest: number
    lastPlayedWeek: string
    newBadgeIds: string[]
  },
  existing: {
    id: string
    wins: number
    points: number
    total_xp?: number
    games_played?: number
    streak_current?: number
    streak_best?: number
    last_played_week?: string | null
    badges?: string[] | null
  } | null
): Promise<{ error?: string }> {
  const now = new Date().toISOString()
  const mergedBadges = [...new Set([...(existing?.badges ?? []), ...delta.newBadgeIds])]

  if (existing) {
    const newXp = (existing.total_xp ?? existing.points ?? 0) + delta.xp
    const { error } = await supabase
      .from('leaderboard')
      .update({
        player_name: playerName.trim(),
        wins: existing.wins + delta.wins,
        points: newXp,
        total_xp: newXp,
        games_played: (existing.games_played ?? 0) + delta.gamesPlayed,
        streak_current: delta.streakCurrent,
        streak_best: delta.streakBest,
        last_played_week: delta.lastPlayedWeek,
        badges: mergedBadges,
        last_played: now,
        updated_at: now,
      })
      .eq('id', existing.id)
    return { error: error?.message }
  }

  const initialXp = delta.xp
  const { error } = await supabase.from('leaderboard').insert({
    player_name: playerName.trim(),
    identifier,
    wins: delta.wins,
    points: initialXp,
    total_xp: initialXp,
    games_played: delta.gamesPlayed,
    streak_current: delta.streakCurrent,
    streak_best: delta.streakBest,
    last_played_week: delta.lastPlayedWeek,
    badges: mergedBadges,
    last_played: now,
    updated_at: now,
  })
  return { error: error?.message }
}

/**
 * Participation only: +10 play, +2/mark, streak; no win XP. Call when player ends session without claiming win.
 */
export async function applyParticipationSession(
  supabase: SupabaseClient,
  params: { gameId: string; cardId: string; playerName: string }
): Promise<ProgressApplyResult> {
  const { gameId, cardId, playerName } = params

  const { data: card } = await supabase
    .from('cards')
    .select('player_identifier')
    .eq('id', cardId)
    .eq('game_id', gameId)
    .single()
  if (!card) return { ok: false, error: 'Card not found' }

  const identifier = (card.player_identifier ?? cardId).trim() || cardId

  const { data: session } = await supabase
    .from('player_game_sessions')
    .select('participation_awarded, win_awarded')
    .eq('game_id', gameId)
    .eq('card_id', cardId)
    .maybeSingle()

  if (session?.participation_awarded) {
    return { ok: true, xpGained: 0, breakdown: { play: 0, marks: 0, win: 0, xBonus: 0, streakMult: 0 }, newBadges: [] }
  }

  const correctMarks = await countCorrectMarks(supabase, gameId, cardId)
  const playXp = XP_PLAY_GAME
  const marksXp = correctMarks * XP_PER_CORRECT_MARK
  const baseBeforeStreak = playXp + marksXp

  const { data: row } = await supabase
    .from('leaderboard')
    .select('id, wins, points, total_xp, games_played, streak_current, streak_best, last_played_week, badges, premium_subscriber')
    .eq('identifier', identifier)
    .maybeSingle()

  const nowWeek = getISOWeekString()
  const streakState = nextStreakState(
    row?.last_played_week,
    row?.streak_current ?? 0,
    row?.streak_best ?? 0,
    nowWeek
  )
  const streakMult = streakMultiplierBonus(baseBeforeStreak, streakState.streakCurrent)
  let xpGained = baseBeforeStreak + streakMult
  const premXp =
    (await isFeatureEnabled(supabase, 'xp_and_badges')) &&
    (await isFeatureEnabled(supabase, 'premium_player_pass')) &&
    row?.premium_subscriber
  if (premXp) xpGained = Math.floor(xpGained * 1.5)

  const gamesPlayed = (row?.games_played ?? 0) + 1
  const totalXpAfter = (row?.total_xp ?? row?.points ?? 0) + xpGained
  const levelInfo = getLevelFromXp(totalXpAfter)
  const newBadges = evaluateNewBadges({
    gamesPlayed,
    wins: row?.wins ?? 0,
    streakCurrent: streakState.streakCurrent,
    level: levelInfo.level,
    existingBadgeIds: row?.badges ?? [],
  })

  const err = await upsertLeaderboardProgress(
    supabase,
    identifier,
    playerName,
    {
      xp: xpGained,
      gamesPlayed: 1,
      wins: 0,
      streakCurrent: streakState.streakCurrent,
      streakBest: streakState.streakBest,
      lastPlayedWeek: streakState.lastPlayedWeek,
      newBadgeIds: newBadges,
    },
    row
      ? {
          id: row.id,
          wins: row.wins ?? 0,
          points: row.points ?? 0,
          total_xp: row.total_xp,
          games_played: row.games_played,
          streak_current: row.streak_current,
          streak_best: row.streak_best,
          last_played_week: row.last_played_week,
          badges: row.badges,
        }
      : null
  )
  if (err.error) return { ok: false, error: err.error }

  await incrementPlayerStats(supabase, playerName, {
    gamesPlayed: 1,
    wins: 0,
    score: xpGained,
  })

  await supabase.from('player_game_sessions').upsert(
    {
      game_id: gameId,
      card_id: cardId,
      identifier,
      participation_awarded: true,
      win_awarded: false,
    },
    { onConflict: 'game_id,card_id' }
  )

  if (await isFeatureEnabled(supabase, 'tournaments')) {
    await applyTournamentParticipation(supabase, { gameId, playerIdentifier: identifier })
  }

  return {
    ok: true,
    xpGained,
    breakdown: {
      play: playXp,
      marks: marksXp,
      win: 0,
      xBonus: 0,
      streakMult,
    },
    newBadges,
  }
}

/**
 * Win claim: full XP if first event for this game/card; otherwise win-only delta.
 */
export async function applyWinClaimProgress(
  supabase: SupabaseClient,
  params: { gameId: string; cardId: string; playerName: string }
): Promise<ProgressApplyResult> {
  const { gameId, cardId, playerName } = params

  const { data: card } = await supabase
    .from('cards')
    .select('player_identifier')
    .eq('id', cardId)
    .eq('game_id', gameId)
    .single()
  if (!card) return { ok: false, error: 'Card not found' }

  const identifier = (card.player_identifier ?? cardId).trim() || cardId

  const { data: session } = await supabase
    .from('player_game_sessions')
    .select('participation_awarded, win_awarded')
    .eq('game_id', gameId)
    .eq('card_id', cardId)
    .maybeSingle()

  if (session?.win_awarded) {
    return { ok: false, error: 'Progress already recorded for this win.' }
  }

  const { data: game } = await supabase.from('games').select('mode').eq('id', gameId).single()
  const mode: WinPattern = normalizeWinPattern(game?.mode)
  const correctMarks = await countCorrectMarks(supabase, gameId, cardId)

  const winBase = XP_WIN_BASE
  const xBonus = mode === 'x' ? XP_WIN_X_BONUS : 0

  const { data: row } = await supabase
    .from('leaderboard')
    .select('id, wins, points, total_xp, games_played, streak_current, streak_best, last_played_week, badges, premium_subscriber')
    .eq('identifier', identifier)
    .maybeSingle()

  const nowWeek = getISOWeekString()
  let playXp = 0
  let marksXp = 0
  let streakMult = 0
  let baseBeforeStreak = 0
  let gamesDelta = 0
  let streakState: { streakCurrent: number; streakBest: number; lastPlayedWeek: string }

  if (!session?.participation_awarded) {
    playXp = XP_PLAY_GAME
    marksXp = correctMarks * XP_PER_CORRECT_MARK
    baseBeforeStreak = playXp + marksXp + winBase + xBonus
    gamesDelta = 1
    streakState = nextStreakState(row?.last_played_week, row?.streak_current ?? 0, row?.streak_best ?? 0, nowWeek)
    streakMult = streakMultiplierBonus(playXp + marksXp + winBase + xBonus, streakState.streakCurrent)
  } else {
    baseBeforeStreak = winBase + xBonus
    streakState = {
      streakCurrent: row?.streak_current ?? 0,
      streakBest: row?.streak_best ?? 0,
      lastPlayedWeek: row?.last_played_week ?? nowWeek,
    }
    streakMult = streakMultiplierBonus(winBase + xBonus, streakState.streakCurrent)
    gamesDelta = 0
  }

  let xpGained = baseBeforeStreak + streakMult
  const premXp =
    (await isFeatureEnabled(supabase, 'xp_and_badges')) &&
    (await isFeatureEnabled(supabase, 'premium_player_pass')) &&
    row?.premium_subscriber
  if (premXp) xpGained = Math.floor(xpGained * 1.5)
  const winsDelta = 1

  const totalXpAfter = (row?.total_xp ?? row?.points ?? 0) + xpGained
  const gamesPlayedAfter = (row?.games_played ?? 0) + gamesDelta
  const winsAfter = (row?.wins ?? 0) + winsDelta
  const levelInfo = getLevelFromXp(totalXpAfter)
  const newBadges = evaluateNewBadges({
    gamesPlayed: gamesPlayedAfter,
    wins: winsAfter,
    streakCurrent: streakState.streakCurrent,
    level: levelInfo.level,
    existingBadgeIds: row?.badges ?? [],
  })

  const err = await upsertLeaderboardProgress(
    supabase,
    identifier,
    playerName,
    {
      xp: xpGained,
      gamesPlayed: gamesDelta,
      wins: winsDelta,
      streakCurrent: streakState.streakCurrent,
      streakBest: streakState.streakBest,
      lastPlayedWeek: streakState.lastPlayedWeek,
      newBadgeIds: newBadges,
    },
    row
      ? {
          id: row.id,
          wins: row.wins ?? 0,
          points: row.points ?? 0,
          total_xp: row.total_xp,
          games_played: row.games_played,
          streak_current: row.streak_current,
          streak_best: row.streak_best,
          last_played_week: row.last_played_week,
          badges: row.badges,
        }
      : null
  )
  if (err.error) return { ok: false, error: err.error }

  await incrementPlayerStats(supabase, playerName, {
    gamesPlayed: gamesDelta,
    wins: winsDelta,
    score: xpGained,
  })

  await supabase.from('player_game_sessions').upsert(
    {
      game_id: gameId,
      card_id: cardId,
      identifier,
      participation_awarded: true,
      win_awarded: true,
    },
    { onConflict: 'game_id,card_id' }
  )

  if (await isFeatureEnabled(supabase, 'tournaments')) {
    await applyTournamentWinClaim(supabase, { gameId, cardId, playerIdentifier: identifier })
  }

  return {
    ok: true,
    xpGained,
    breakdown: {
      play: playXp,
      marks: marksXp,
      win: winBase,
      xBonus,
      streakMult,
    },
    newBadges,
  }
}
