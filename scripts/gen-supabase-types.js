#!/usr/bin/env node
/**
 * Regenerate types/database.types.ts from live Postgres (DATABASE_URL).
 * Also runs NOTIFY pgrst if --reload is passed (default).
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const { Client } = require('pg')
const { generateFromPostgres } = require('./pg-to-database-types')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local'), override: true })

async function reloadSchema(client) {
  await client.query(`NOTIFY pgrst, 'reload schema'`)
  console.log('PostgREST schema cache reload sent (NOTIFY pgrst).')
}

async function main() {
  let connectionString = process.env.DATABASE_URL?.trim()?.replace(/^"+|"+$/g, '')
  if (connectionString) {
    try {
      connectionString = decodeURIComponent(connectionString)
    } catch {
      // keep as-is
    }
  }
  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env.local.')
    process.exit(1)
  }

  const skipReload = process.argv.includes('--no-reload')
  if (!skipReload) {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
    try {
      await client.connect()
      await reloadSchema(client)
    } finally {
      await client.end()
    }
  }

  console.log('Generating TypeScript types from database schema…')
  const { spawnSync } = require('child_process')
  const result = spawnSync(
    'npx',
    ['supabase', 'gen', 'types', 'typescript', '--db-url', connectionString, '--schema', 'public'],
    { encoding: 'utf8', maxBuffer: 15 * 1024 * 1024, shell: true }
  )

  let out = result.stdout
  if (result.status !== 0) {
    console.warn('supabase CLI unavailable (Docker/login). Falling back to Postgres introspection…')
    if (result.stderr) console.warn(result.stderr.split('\n')[0])
    out = await generateFromPostgres(connectionString)
  }

  if (!out?.trim()) {
    throw new Error('Type generation produced empty output')
  }

  const target = path.join(__dirname, '..', 'types', 'database.types.ts')
  fs.writeFileSync(target, out)
  console.log(`Wrote ${out.length} bytes to types/database.types.ts`)

  if (out.includes('username') && out.includes('players')) {
    console.log('Confirmed: generated types include public.players.username')
  } else {
    console.warn('Warning: players.username not found in generated output.')
  }

  const playersBlock = out.match(/players:\s*\{[\s\S]*?Row:\s*\{([\s\S]*?)\}/)
  if (playersBlock) {
    console.log('players.Row fields:', [...playersBlock[1].matchAll(/(\w+):/g)].map((m) => m[1]).join(', '))
  }
}

main().catch((e) => {
  console.error('Failed:', e.message)
  process.exit(1)
})
