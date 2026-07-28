#!/usr/bin/env node
/**
 * Production smoke test for lyricgrid.ca (or VERCEL_URL).
 * Usage: node scripts/smoke-test-production.js [baseUrl]
 */
const base = (process.argv[2] || 'https://lyricgrid.ca').replace(/\/$/, '')

async function get(path) {
  const url = `${base}${path}`
  const res = await fetch(url, { redirect: 'follow' })
  const text = await res.text()
  return { url, status: res.status, text, ok: res.ok }
}

async function post(path, body) {
  const url = `${base}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    // keep text
  }
  return { url, status: res.status, text, json, ok: res.ok }
}

async function main() {
  console.log(`Smoke test: ${base}\n`)
  let failed = 0

  const health = await get('/api/supabase-health')
  console.log(`[${health.ok ? 'PASS' : 'FAIL'}] GET /api/supabase-health → ${health.status}`)
  if (health.ok) {
    try {
      const j = JSON.parse(health.text)
      console.log(`       ${j.message ?? JSON.stringify(j)}`)
      if (!j.ok) failed++
    } catch {
      failed++
    }
  } else failed++

  const join = await get('/join')
  console.log(`[${join.ok ? 'PASS' : 'FAIL'}] GET /join → ${join.status}`)
  const hasJoinForm =
    join.text.includes('Join') || join.text.includes('join') || join.text.includes('room')
  console.log(`       join UI markers: ${hasJoinForm ? 'found' : 'missing'}`)
  if (!join.ok || !hasJoinForm) failed++

  const preview = await get('/api/game-join-preview?code=LYRIC')
  console.log(`[${preview.ok ? 'PASS' : 'FAIL'}] GET /api/game-join-preview?code=LYRIC → ${preview.status}`)
  if (preview.ok) {
    try {
      const j = JSON.parse(preview.text)
      console.log(`       game: ${j.game?.status ?? j.status ?? 'unknown'}, songs: ${j.songCount ?? j.songs ?? '?'}`)
      if (j.error) failed++
    } catch {
      console.log(`       body: ${preview.text.slice(0, 120)}`)
    }
  } else failed++

  const card = await post('/api/bingo/generate-card', {
    gameCode: 'LYRIC',
    username: `SmokeTest-${Date.now()}`,
    playerIdentifier: `smoke-${Date.now()}`,
  })
  console.log(
    `[${card.ok && card.json?.ok ? 'PASS' : 'FAIL'}] POST /api/bingo/generate-card → ${card.status}`
  )
  if (card.json?.ok) {
    console.log(`       cardId: ${card.json.cardId}, cells: ${card.json.cellCount ?? card.json.gridData?.length}`)
  } else {
    console.log(`       ${card.text.slice(0, 200)}`)
    failed++
  }

  // Static bundle should still ship player board + haptic helper code paths
  const playBundleProbe = await get('/join')
  const hasBoardMarkers =
    playBundleProbe.text.includes('bingo') ||
    playBundleProbe.text.includes('grid') ||
    playBundleProbe.text.includes('LYRIC')
  console.log(`[${hasBoardMarkers ? 'PASS' : 'WARN'}] Game board route markers on /join`)
  if (!hasBoardMarkers) failed++

  console.log('\n' + (failed === 0 ? 'All smoke checks passed.' : `${failed} check(s) failed.`))
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
