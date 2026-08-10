#!/usr/bin/env node
/**
 * End-to-end LyricGrid gameflow verification against Supabase.
 *
 * Usage:
 *   npm run test:gameflow
 *   npx tsx scripts/test-gameflow.ts
 */
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { generateCardLayout } from '../lib/bingo/cards'
import { verifyBingo } from '../lib/bingo-evaluator'
import { getFreeCenterPosition } from '../lib/bingo-win-pattern'

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true })

type StepResult = { name: string; ok: boolean; detail: string }

const ROUTES: { href: string; file: string; label: string }[] = [
  { href: '/', file: 'app/(kingz)/page.tsx', label: 'Home' },
  { href: '/join', file: 'app/join/page.tsx', label: 'Join' },
  { href: '/play/[gameId]', file: 'app/play/[gameId]/page.tsx', label: 'Play' },
  { href: '/stage/[gameId]', file: 'app/stage/[gameId]/page.tsx', label: 'Stage' },
  { href: '/host', file: 'app/host/page.tsx', label: 'Host Dashboard' },
  { href: '/host/[gameId]', file: 'app/host/[gameId]/page.tsx', label: 'Host Control' },
  { href: '/media-manager', file: 'app/media-manager/page.tsx', label: 'Media Manager' },
  { href: '/playlists', file: 'app/playlists/page.tsx', label: 'Playlists' },
  { href: '/leaderboard', file: 'app/leaderboard/page.tsx', label: 'Leaderboard' },
  { href: '/profile', file: 'app/profile/page.tsx', label: 'Profile' },
  { href: '/sitemap', file: 'app/sitemap/page.tsx', label: 'Sitemap' },
  { href: '/kingz-control', file: 'app/kingz-control/page.tsx', label: 'KingzControl' },
]

function randomJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'T'
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function createSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key in .env.local')
  }
  return createClient(url, key)
}

async function countActiveTracks(supabase: SupabaseClient): Promise<number> {
  const counts = await Promise.all([
    supabase.from('theme_songs').select('*', { count: 'exact', head: true }),
    supabase.from('playlist_songs').select('*', { count: 'exact', head: true }),
    supabase.from('bingo_game_tracks').select('*', { count: 'exact', head: true }).is('game_id', null),
  ])
  const themeSongs = counts[0].count ?? 0
  const playlistSongs = counts[1].count ?? 0
  const libraryTracks = counts[2].count ?? 0
  return Math.max(themeSongs, playlistSongs, libraryTracks)
}

function auditRoutes(root: string): StepResult[] {
  return ROUTES.map((route) => {
    const full = path.join(root, route.file)
    const ok = fs.existsSync(full)
    return {
      name: `Route ${route.href}`,
      ok,
      detail: ok ? route.file : `Missing ${route.file}`,
    }
  })
}

async function runGameflow(supabase: SupabaseClient): Promise<{ steps: StepResult[]; trackCount: number }> {
  const steps: StepResult[] = []
  let gameId: string | null = null
  let cardId: string | null = null
  let playlistId: string | null = null
  let trackCount = 0

  try {
    trackCount = await countActiveTracks(supabase)

    const { data: themes, error: themesError } = await supabase
      .from('themes')
      .select('id, name')
      .order('name')
      .limit(20)

    if (themesError) {
      steps.push({ name: 'Query themes', ok: false, detail: themesError.message })
      return { steps, trackCount }
    }

    let activeTheme: { id: string; name: string } | null = null
    let themeSongCount = 0

    for (const theme of themes ?? []) {
      const { count, error } = await supabase
        .from('theme_songs')
        .select('*', { count: 'exact', head: true })
        .eq('theme_id', theme.id)
      if (error) continue
      if ((count ?? 0) > 0) {
        activeTheme = theme
        themeSongCount = count ?? 0
        break
      }
    }

    steps.push({
      name: 'Query theme + theme_songs',
      ok: !!activeTheme && themeSongCount > 0,
      detail: activeTheme
        ? `${activeTheme.name}: ${themeSongCount} theme_songs`
        : 'No theme with theme_songs > 0',
    })

    if (!activeTheme) {
      return { steps, trackCount }
    }

    const { data: themeSongRows, error: themeSongsError } = await supabase
      .from('theme_songs')
      .select('youtube_id, title, position')
      .eq('theme_id', activeTheme.id)
      .order('position')
      .limit(50)

    if (themeSongsError || !themeSongRows?.length) {
      steps.push({
        name: 'Load theme_songs',
        ok: false,
        detail: themeSongsError?.message ?? 'No theme_songs rows',
      })
      return { steps, trackCount }
    }

    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .insert({ name: `__gameflow_test_${Date.now()}` })
      .select('id')
      .single()

    if (playlistError || !playlist) {
      steps.push({ name: 'Create temp playlist', ok: false, detail: playlistError?.message ?? 'No playlist' })
      return { steps, trackCount }
    }
    playlistId = playlist.id

    const insertSongs = themeSongRows.slice(0, Math.max(25, themeSongRows.length)).map((row, idx) => ({
      playlist_id: playlistId!,
      youtube_id: row.youtube_id,
      title: row.title ?? `Track ${idx + 1}`,
      position: row.position ?? idx,
      source: 'youtube' as const,
    }))

    const { data: insertedSongs, error: insertSongsError } = await supabase
      .from('playlist_songs')
      .insert(insertSongs)
      .select('id')

    if (insertSongsError || !insertSongs?.length || insertedSongs.length < 25) {
      steps.push({
        name: 'Seed temp playlist_songs',
        ok: false,
        detail:
          insertSongsError?.message ??
          `Need ≥25 songs, inserted ${insertedSongs?.length ?? 0} (theme has ${themeSongRows.length})`,
      })
      return { steps, trackCount }
    }

    const songIds = insertedSongs.map((r) => r.id)

    const joinCode = randomJoinCode()
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        playlist_id: playlistId,
        theme_id: activeTheme.id,
        code: joinCode,
        room_code: joinCode,
        status: 'lobby',
        mode: 'line',
        grid_size: 5,
      })
      .select('id, code, room_code')
      .single()

    if (gameError || !game) {
      steps.push({ name: 'Create game session', ok: false, detail: gameError?.message ?? 'Insert failed' })
      return { steps, trackCount }
    }
    gameId = game.id

    steps.push({
      name: 'Create game session',
      ok: joinCode.length === 6,
      detail: `games.id=${game.id.slice(0, 8)}… code=${joinCode}`,
    })

    const layout = generateCardLayout(songIds, 5)
    const freePos = getFreeCenterPosition(5)
    const freeOk = freePos === 12

    steps.push({
      name: 'FREE center [2,2]',
      ok: freeOk,
      detail: freeOk ? `position ${freePos} (row 2, col 2)` : `Expected 12, got ${freePos}`,
    })

    const boardSongs = layout.map((cell) => ({
      position: cell.position,
      songId: cell.playlistSongId,
    }))

    const gridData = layout.map((cell) => ({
      position: cell.position,
      playlist_song_id: cell.playlistSongId,
      marked: false,
    }))

    const { data: card, error: cardError } = await supabase
      .from('cards')
      .insert({
        game_id: gameId,
        player_name: '__gameflow_test__',
        player_identifier: `test-${Date.now()}`,
        grid_data: gridData,
      })
      .select('id')
      .single()

    if (cardError || !card) {
      steps.push({ name: 'Generate player board', ok: false, detail: cardError?.message ?? 'Card insert failed' })
      return { steps, trackCount }
    }
    cardId = card.id

    const cellRows = layout.map((c) => ({
      card_id: cardId!,
      position: c.position,
      playlist_song_id: c.playlistSongId,
    }))
    const { error: cellsError } = await supabase.from('card_cells').insert(cellRows)
    if (cellsError && !/card_cells|schema cache|does not exist/i.test(cellsError.message)) {
      steps.push({ name: 'card_cells insert', ok: false, detail: cellsError.message })
    }

    steps.push({
      name: 'Generate 5×5 player board',
      ok: layout.length === 25,
      detail: `cards.id=${cardId!.slice(0, 8)}… (${layout.length} cells)`,
    })

    const winningLine = [0, 1, 2, 3, 4]
    const calledIds = winningLine.map((pos) => boardSongs.find((s) => s.position === pos)!.songId)

    const playedRows = calledIds.map((playlist_song_id) => ({
      game_id: gameId!,
      playlist_song_id,
      round: 1,
    }))
    const { error: playedError } = await supabase.from('played_songs').insert(playedRows)
    if (playedError) {
      steps.push({ name: 'Simulate called songs', ok: false, detail: playedError.message })
      return { steps, trackCount }
    }

    steps.push({
      name: 'Simulate 5 called songs',
      ok: calledIds.length === 5,
      detail: `played_songs × ${calledIds.length} (top row line)`,
    })

    const result = verifyBingo(boardSongs, new Set(calledIds), new Set(calledIds), 'LINE', 5)

    steps.push({
      name: 'verifyBingo LINE',
      ok: result.valid === true,
      detail: result.valid
        ? `WIN — positions ${result.winningPositions?.join(', ')}`
        : result.error ?? 'Expected valid LINE win',
    })

    return { steps, trackCount }
  } finally {
    if (gameId) {
      await supabase.from('games').delete().eq('id', gameId)
    }
    if (playlistId) {
      await supabase.from('playlist_songs').delete().eq('playlist_id', playlistId)
      await supabase.from('playlists').delete().eq('id', playlistId)
    }
    steps.push({
      name: 'Cleanup test data',
      ok: true,
      detail: gameId ? `Deleted test game + temp playlist` : 'Nothing to delete',
    })
  }
}

function printTable(rows: { metric: string; value: string }[]) {
  const col1 = Math.max(...rows.map((r) => r.metric.length), 6)
  console.log('')
  console.log('┌─' + '─'.repeat(col1 + 2) + '┬─' + '─'.repeat(40) + '┐')
  console.log(`│ ${'Metric'.padEnd(col1)} │ ${'Value'.padEnd(40)} │`)
  console.log('├─' + '─'.repeat(col1 + 2) + '┼─' + '─'.repeat(40) + '┤')
  for (const row of rows) {
    console.log(`│ ${row.metric.padEnd(col1)} │ ${row.value.padEnd(40)} │`)
  }
  console.log('└─' + '─'.repeat(col1 + 2) + '┴─' + '─'.repeat(40) + '┘')
  console.log('')
}

async function main(): Promise<void> {
  const root = path.join(__dirname, '..')
  let gameflowStatus: 'PASSED' | 'FAILED' = 'FAILED'
  let trackCount = 0

  console.log('LyricGrid — Gameflow Verification')
  console.log('=================================\n')

  const routeSteps = auditRoutes(root)
  const routesOk = routeSteps.every((s) => s.ok)

  console.log('Route audit:')
  for (const step of routeSteps) {
    console.log(`  ${step.ok ? '✓' : '✗'} ${step.name} — ${step.detail}`)
  }
  console.log(routesOk ? '\nAll core routes wired.\n' : '\nSome routes missing.\n')

  try {
    const supabase = createSupabase()
    const { steps, trackCount: tracks } = await runGameflow(supabase)
    trackCount = tracks

    console.log('Gameflow test:')
    for (const step of steps) {
      console.log(`  ${step.ok ? '✓' : '✗'} ${step.name} — ${step.detail}`)
    }

    gameflowStatus = steps.every((s) => s.ok) && routesOk ? 'PASSED' : 'FAILED'
  } catch (e) {
    console.error('\nGameflow error:', e instanceof Error ? e.message : e)
    gameflowStatus = 'FAILED'
  }

  printTable([
    { metric: 'DB tracks (active)', value: String(trackCount) },
    { metric: 'Route audit', value: routesOk ? 'OK' : 'MISSING FILES' },
    { metric: 'Gameflow test', value: gameflowStatus },
  ])

  if (gameflowStatus !== 'PASSED') {
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
