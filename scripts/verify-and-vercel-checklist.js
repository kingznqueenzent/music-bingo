#!/usr/bin/env node
/**
 * Verify .env.local against the Vercel env catalog and print a dashboard checklist.
 * Run: npm run verify-env
 */
const fs = require('fs')
const path = require('path')
const { requiredForProduction, recommended } = require('../config/vercel-env.js')

function getEnv() {
  const p = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(p)) return null
  const c = fs.readFileSync(p, 'utf8')
  const vars = {}
  for (const line of c.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m) {
      let v = m[2].trim()
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1)
      }
      vars[m[1]] = v
    }
  }
  return vars
}

function status(value) {
  if (!value) return 'MISSING'
  return `set (length ${value.length})`
}

async function main() {
  const vars = getEnv()
  console.log('=== LyricGrid env audit ===\n')

  if (!vars) {
    console.log('No .env.local found. Copy .env.example → .env.local')
    process.exitCode = 1
    return
  }

  console.log('Required for Vercel Production:')
  let missing = 0
  for (const d of requiredForProduction) {
    const v = vars[d.name]?.trim()
    const ok = Boolean(v)
    if (!ok) missing += 1
    console.log(`  ${ok ? '✓' : '✗'} ${d.name}: ${status(v)}`)
    console.log(`      ${d.description}`)
  }

  console.log('\nRecommended:')
  for (const d of recommended) {
    const v = vars[d.name]?.trim()
    console.log(`  ${v ? '✓' : '·'} ${d.name}: ${status(v)}`)
  }

  const url = vars.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = vars.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (url && anon) {
    try {
      const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      })
      console.log(`\nSupabase anon probe: ${r.status === 200 ? 'OK' : `status ${r.status}`}`)
    } catch (e) {
      console.log(`\nSupabase anon probe: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  console.log('\n--- Vercel dashboard mapping ---')
  console.log('1. https://vercel.com/dashboard → music-bingo → Settings → Environment Variables')
  console.log('2. Ensure Production has every REQUIRED key above (same values as .env.local)')
  console.log('3. Or run: npm run vercel:env-push')
  console.log('4. Redeploy Production after changes')
  console.log('5. Confirm with: npx vercel env ls')

  if (missing) {
    console.log(`\n${missing} required variable(s) missing locally — fix .env.local before pushing.`)
    process.exitCode = 1
  } else {
    console.log('\nLocal required set looks complete.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
