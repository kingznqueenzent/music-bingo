#!/usr/bin/env node
const path = require('path')
const { Client } = require('pg')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.local'), override: true })

function normalizeConnectionString(raw) {
  let url = raw.trim().replace(/^"+|"+$/g, '')
  try {
    url = decodeURIComponent(url)
  } catch {
    // keep encoded form
  }
  return url
}

function projectRefFromUrl(url) {
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

function buildConnectionCandidates(raw) {
  const base = normalizeConnectionString(raw)
  const candidates = [base]

  try {
    const u = new URL(base)
    const password = u.password
    const ref = projectRefFromUrl(base) ?? 'dmcjpkrdivafkqoovyvn'

    candidates.push(`postgresql://postgres:${password}@db.${ref}.supabase.co:5432/postgres`)

    if (u.hostname.includes('pooler')) {
      if (u.port === '6543') {
        candidates.push(base.replace(':6543/', ':5432/'))
      }
      const regions = ['aws-1-ca-central-1', 'aws-0-ca-central-1', 'aws-0-us-east-1', 'aws-0-us-west-1']
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

async function connectPg(rawUrl) {
  const candidates = buildConnectionCandidates(rawUrl)
  let lastError = null

  for (const connectionString of candidates) {
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
      return { client, label, connectionString }
    } catch (e) {
      lastError = e
      console.warn(`  ✗ ${label} — ${e.message}`)
      try {
        await client.end()
      } catch {
        // ignore
      }
    }
  }

  throw lastError ?? new Error('Could not connect to Postgres with any candidate URL')
}

async function main() {
  const raw = process.env.DATABASE_URL
  if (!raw) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  console.log('Testing Postgres connection candidates…')
  const { client, label } = await connectPg(raw)
  const { rows } = await client.query('SELECT COUNT(*)::int AS themes FROM public.themes')
  console.log(`✓ Connected via ${label}`)
  console.log(`  themes: ${rows[0].themes}`)
  await client.end()
}

if (require.main === module) {
  main().catch((e) => {
    console.error('Failed:', e.message)
    process.exit(1)
  })
}

module.exports = { connectPg, buildConnectionCandidates, normalizeConnectionString }
