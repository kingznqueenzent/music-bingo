#!/usr/bin/env node
/**
 * Apply a Supabase SQL migration via direct Postgres connection.
 *
 * Usage:
 *   npx tsx scripts/apply-migration.ts
 *   npx tsx scripts/apply-migration.ts supabase/migrations/20260730140000_player_profiles.sql
 */
import fs from 'fs'
import path from 'path'
import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true })

import { SYNC_ALL_PLAYER_PROFILES_SQL } from '../lib/player-profile-sync'

const DEFAULT_MIGRATION = 'supabase/migrations/20260730140000_player_profiles.sql'

const SYNC_ALL_ADMINS_SQL = SYNC_ALL_PLAYER_PROFILES_SQL

function normalizeConnectionString(raw: string): string {
  let url = raw.trim().replace(/^"+|"+$/g, '')
  try {
    url = decodeURIComponent(url)
  } catch {
    // keep encoded form
  }
  return url
}

function projectRefFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.username.includes('.')) {
      return u.username.split('.').slice(1).join('.') || null
    }
    const hostMatch = u.hostname.match(/^db\.([^.]+)\.supabase\.co$/)
    if (hostMatch) return hostMatch[1]
  } catch {
    return null
  }
  return null
}

function buildConnectionCandidates(raw: string): string[] {
  const base = normalizeConnectionString(raw)
  const candidates: string[] = [base]

  try {
    const u = new URL(base)
    const password = u.password
    const ref = projectRefFromUrl(base) ?? 'dmcjpkrdivafkqoovyvn'

    candidates.push(`postgresql://postgres:${password}@db.${ref}.supabase.co:5432/postgres`)

    if (u.hostname.includes('pooler')) {
      if (u.port === '6543') {
        candidates.push(base.replace(':6543/', ':5432/'))
      }
      const regions = ['aws-0-us-east-1', 'aws-1-ca-central-1', 'aws-0-ca-central-1', 'aws-0-us-west-1']
      for (const region of regions) {
        candidates.push(
          `postgresql://postgres.${ref}:${password}@${region}.pooler.supabase.com:5432/postgres`
        )
      }
    }
  } catch {
    // use base only
  }

  return [...new Set(candidates)]
}

async function connectWithFallback(connectionStrings: string[]): Promise<{ client: Client; label: string }> {
  let lastError: Error | null = null

  for (const connectionString of connectionStrings) {
    let label = 'DATABASE_URL'
    try {
      const u = new URL(connectionString)
      label = `${u.hostname}:${u.port || '5432'}`
    } catch {
      label = 'connection'
    }

    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
    try {
      await client.connect()
      console.log(`Connected via ${label}`)
      return { client, label }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      const msg = lastError.message
      console.warn(`  ✗ ${label} — ${msg}`)
      try {
        await client.end()
      } catch {
        // ignore
      }
    }
  }

  throw lastError ?? new Error('Could not connect to Postgres with any candidate URL')
}

async function main(): Promise<void> {
  const migrationArg = process.argv[2] ?? DEFAULT_MIGRATION
  const migrationPath = path.isAbsolute(migrationArg)
    ? migrationArg
    : path.join(__dirname, '..', migrationArg)

  if (!fs.existsSync(migrationPath)) {
    console.error('Migration file not found:', migrationPath)
    process.exit(1)
  }

  const rawUrl = process.env.DATABASE_URL?.trim()
  if (!rawUrl) {
    console.error('DATABASE_URL is not set in .env.local')
    process.exit(1)
  }

  const sql = fs.readFileSync(migrationPath, 'utf8')
  const candidates = buildConnectionCandidates(rawUrl)

  console.log('LyricGrid — Apply migration')
  console.log('=========================')
  console.log('File:', path.relative(path.join(__dirname, '..'), migrationPath))
  console.log(`Trying ${candidates.length} connection variant(s)…\n`)

  const { client } = await connectWithFallback(candidates)

  try {
    console.log('\nApplying migration SQL…')
    await client.query(sql)

    console.log('Syncing auth.users → player_profiles (admin)…')
    await client.query(SYNC_ALL_ADMINS_SQL)

    try {
      await client.query(`NOTIFY pgrst, 'reload schema'`)
      console.log('Notified PostgREST to reload schema cache.')
    } catch {
      console.warn('Could not NOTIFY pgrst (non-fatal).')
    }

    const { rows: tableCheck } = await client.query<{ regclass: string | null }>(
      `SELECT to_regclass('public.player_profiles') AS regclass`
    )
    if (!tableCheck[0]?.regclass) {
      throw new Error('player_profiles table was not created')
    }

    const { rows: admins } = await client.query<{
      email: string | null
      role: string | null
      is_admin: boolean | null
      display_name: string | null
    }>(
      `SELECT email, role, is_admin, display_name
       FROM public.player_profiles
       WHERE is_admin = true OR lower(coalesce(role, '')) = 'admin'
       ORDER BY email NULLS LAST`
    )

    const { rows: counts } = await client.query<{ total: string; admin_count: string }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE is_admin = true OR lower(coalesce(role, '')) = 'admin')::text AS admin_count
       FROM public.player_profiles`
    )

    console.log('\n✓ Migration applied successfully')
    console.log(`  player_profiles rows: ${counts[0]?.total ?? '0'} (${counts[0]?.admin_count ?? '0'} admin)`)

    if (admins.length === 0) {
      const { rows: authUsers } = await client.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM auth.users`
      )
      const authCount = authUsers[0]?.n ?? '0'
      console.warn(`\n⚠ No admin profiles found (auth.users count: ${authCount}).`)
      console.warn('  Register/sign in via Supabase Auth, then re-run this script to sync profiles.')
    } else {
      console.log('\nActive admin emails:')
      for (const row of admins) {
        console.log(`  • ${row.email ?? '(no email)'} — ${row.display_name ?? 'Host / Admin'} [role=${row.role}, is_admin=${row.is_admin}]`)
      }
    }
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('\nMigration failed:', e instanceof Error ? e.message : e)
  process.exit(1)
})
