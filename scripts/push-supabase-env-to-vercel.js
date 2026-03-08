#!/usr/bin/env node
/**
 * Push the three Supabase env vars from .env.local to Vercel (production).
 * Run: npm run vercel:env-push
 * Requires: Vercel CLI and project linked (npx vercel link once).
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

function getEnv() {
  const p = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(p)) return null
  const c = fs.readFileSync(p, 'utf8')
  const vars = {}
  for (const line of c.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m) {
      let v = m[2].trim()
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\"/g, '"')
      vars[m[1]] = v
    }
  }
  return vars
}

function vercelEnvAdd(name, value, env) {
  const result = spawnSync('npx', ['vercel', 'env', 'add', name, env, '--force', '--yes', '--value', value], {
    shell: true,
    encoding: 'utf8',
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  return result.status === 0
}

function main() {
  const vars = getEnv()
  if (!vars) {
    console.error('No .env.local found. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY there first.')
    process.exit(1)
  }
  const url = vars.NEXT_PUBLIC_SUPABASE_URL
  const anon = vars.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const role = vars.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !role) {
    console.error('Missing in .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const names = [
    ['NEXT_PUBLIC_SUPABASE_URL', url],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', anon],
    ['SUPABASE_SERVICE_ROLE_KEY', role],
  ]
  const envs = ['production'] // preview requires git branch in CLI; set in Vercel dashboard if needed

  console.log('Pushing 3 Supabase vars to Vercel (production)...')
  for (const [name, value] of names) {
    for (const env of envs) {
      process.stdout.write(`  ${name} [${env}] ... `)
      const ok = vercelEnvAdd(name, value, env)
      console.log(ok ? 'OK' : 'FAILED')
      if (!ok) process.exit(1)
    }
  }
  console.log('Done. Redeploy in Vercel (Deployments → ⋯ → Redeploy) for changes to take effect.')
}

main()
