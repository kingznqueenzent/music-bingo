import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeWinPattern, type WinPattern } from '@/lib/bingo-win-pattern'
import { finalizeDueTournaments } from '@/lib/tournament-finalize'

const PTS_PLAY_ROUND = 10
const PTS_WIN_ROUND = 50
const PTS_X_PATTERN = 75
const PTS_FASTEST = 25
const PTS_FULL_ATTENDANCE = 100

export type TournamentRow = {
  id: string
  theme_ids: string[] | null
  rounds_total: number
  status: string
  start_date: string
  end_date: string
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

function themeEligible(themeId: string | null | undefined, themeIds: string[] | null): boolean {
  if (!themeIds || themeIds.length === 0) return true
  if (!themeId) return false
  return themeIds.includes(themeId)
}

async function loadActiveTournaments(supabase: SupabaseClient, gameThemeId: string | null | undefined) {
  const today = todayISODate()
  await supabase
    .from('tournaments')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('status', 'upcoming')
    .lte('start_date', today)
    .gte('end_date', today)

  const { data } = await supabase
    .from('tournaments')
    .select('id, theme_ids, rounds_total, status, start_date, end_date')
    .in('status', ['upcoming', 'active'])
    .lte('start_date', today)
    .gte('end_date', today)

  const rows = (data ?? []) as TournamentRow[]
  return rows.filter((t) => themeEligible(gameThemeId ?? null, (t.theme_ids as string[] | null) ?? []))
}

async function getOrCreateEvent(
  supabase: SupabaseClient,
  tournamentId: string,
  gameId: string,
  entryId: string
) {
  const { data: existing } = await supabase
    .from('tournament_game_events')
    .select('id, participation_applied, win_applied, fastest_applied')
    .eq('tournament_id', tournamentId)
    .eq('game_id', gameId)
    .eq('entry_id', entryId)
    .maybeSingle()

  if (existing) return existing

  const { data: inserted, error } = await supabase
    .from('tournament_game_events')
    .insert({
      tournament_id: tournamentId,
      game_id: gameId,
      entry_id: entryId,
      participation_applied: false,
      win_applied: false,
      fastest_applied: false,
    })
    .select('id, participation_applied, win_applied, fastest_applied')
    .single()

  if (error || !inserted) return null
  return inserted
}

async function isFastestBingoInGame(
  supabase: SupabaseClient,
  gameId: string,
  cardId: string
): Promise<boolean> {
  const { data: rows } = await supabase
    .from('wins')
    .select('card_id, created_at')
    .eq('game_id', gameId)
    .order('created_at', { ascending: true })
    .limit(1)

  const first = rows?.[0] as { card_id: string } | undefined
  return first?.card_id === cardId
}

async function maybeApplyAttendanceBonus(
  supabase: SupabaseClient,
  tournament: TournamentRow,
  entryId: string,
  roundsPlayed: number,
  hadAttendance: boolean
) {
  if (hadAttendance) return
  if (roundsPlayed < tournament.rounds_total) return

  const { data: entry } = await supabase
    .from('tournament_entries')
    .select('points, attendance_bonus_applied')
    .eq('id', entryId)
    .single()

  const e = entry as { points: number; attendance_bonus_applied: boolean } | null
  if (!e || e.attendance_bonus_applied) return

  await supabase
    .from('tournament_entries')
    .update({
      points: e.points + PTS_FULL_ATTENDANCE,
      attendance_bonus_applied: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId)
}

export async function applyTournamentParticipation(
  supabase: SupabaseClient,
  params: { gameId: string; playerIdentifier: string }
): Promise<void> {
  const { gameId, playerIdentifier } = params
  const id = playerIdentifier.trim()
  if (!id) return

  const { data: game } = await supabase.from('games').select('theme_id').eq('id', gameId).single()
  const tournaments = await loadActiveTournaments(supabase, game?.theme_id as string | undefined)

  for (const t of tournaments) {
    const { data: entryRow } = await supabase
      .from('tournament_entries')
      .select('id, points, rounds_played, attendance_bonus_applied')
      .eq('tournament_id', t.id)
      .eq('player_identifier', id)
      .maybeSingle()

    if (!entryRow) continue

    const ev = await getOrCreateEvent(supabase, t.id, gameId, entryRow.id)
    if (!ev || ev.participation_applied) continue

    const newPoints = entryRow.points + PTS_PLAY_ROUND
    const newRounds = entryRow.rounds_played + 1

    await supabase
      .from('tournament_entries')
      .update({
        points: newPoints,
        rounds_played: newRounds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryRow.id)

    await supabase
      .from('tournament_game_events')
      .update({ participation_applied: true })
      .eq('tournament_id', t.id)
      .eq('game_id', gameId)
      .eq('entry_id', entryRow.id)

    await maybeApplyAttendanceBonus(supabase, t, entryRow.id, newRounds, entryRow.attendance_bonus_applied)
  }

  await finalizeDueTournaments(supabase)
}

export async function applyTournamentWinClaim(
  supabase: SupabaseClient,
  params: {
    gameId: string
    cardId: string
    playerIdentifier: string
  }
): Promise<void> {
  const { gameId, cardId, playerIdentifier } = params
  const id = playerIdentifier.trim()
  if (!id) return

  const { data: game } = await supabase.from('games').select('theme_id, mode').eq('id', gameId).single()
  const mode: WinPattern = normalizeWinPattern(game?.mode)
  const tournaments = await loadActiveTournaments(supabase, game?.theme_id as string | undefined)

  const winPts = PTS_WIN_ROUND
  const xPts = mode === 'x' ? PTS_X_PATTERN : 0

  for (const t of tournaments) {
    const { data: entryRow } = await supabase
      .from('tournament_entries')
      .select('id, points, rounds_played, attendance_bonus_applied')
      .eq('tournament_id', t.id)
      .eq('player_identifier', id)
      .maybeSingle()

    if (!entryRow) continue

    const ev = await getOrCreateEvent(supabase, t.id, gameId, entryRow.id)
    if (!ev || ev.win_applied) continue

    let pts = 0
    let roundsDelta = 0

    if (!ev.participation_applied) {
      pts += PTS_PLAY_ROUND
      roundsDelta = 1
    }

    pts += winPts + xPts

    let fastestNow = ev.fastest_applied
    const isFast = await isFastestBingoInGame(supabase, gameId, cardId)
    if (isFast && !ev.fastest_applied) {
      pts += PTS_FASTEST
      fastestNow = true
    }

    const newPoints = entryRow.points + pts
    const newRounds = entryRow.rounds_played + roundsDelta

    await supabase
      .from('tournament_entries')
      .update({
        points: newPoints,
        rounds_played: newRounds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryRow.id)

    await supabase
      .from('tournament_game_events')
      .update({
        participation_applied: true,
        win_applied: true,
        fastest_applied: fastestNow,
      })
      .eq('tournament_id', t.id)
      .eq('game_id', gameId)
      .eq('entry_id', entryRow.id)

    await maybeApplyAttendanceBonus(supabase, t, entryRow.id, newRounds, entryRow.attendance_bonus_applied)
  }

  await finalizeDueTournaments(supabase)
}
