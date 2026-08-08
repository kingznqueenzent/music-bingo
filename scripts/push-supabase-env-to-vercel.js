#!/usr/bin/env node
/**
 * Push LyricGrid env vars from .env.local to Vercel.
 * Run: npm run vercel:env-push
 * Requires: `npx vercel login` and a linked project (`npx vercel link`).
 *
 * Catalog: config/vercel-env.js
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = useSpawn()
const {
  requiredForProduction,
  recommended,
  pushByDefault,
  localOnly,
} = require('../config/vercel-env.js')

function useSpawn() {
  return { spawnSync: require('child_process').spawnSync }
}

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

function vercelEnvAdd(name, value, environment) {
  const result = spawnSync(
    'npx',
    ['vercel', 'env', 'add', name, environment, '--force', '--yes', '--value', value],
    { shell: true, encoding: 'utf8' }
  )
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  return result.status === 0
}

function main() {
  const args = process.argv.slice(2)
  const alsoPreview = args.includes('--preview')
  const allRecommended = args.includes('--all-recommended')

  const vars = getEnv()
  if (!vars) {
    console.error('No .env.local found. Copy .env.example → .env.local and fill values.')
    process.exit(1)
  }

  const missingRequired = requiredForProduction
    .map((d) => d.name)
    .filter((name) => !vars[name]?.trim())

  if (missingRequired.length) {
    console.error('Missing required keys in .env.local:')
    for (const name of missingRequired) console.error(`  - ${name}`)
    process.exit(1)
  }

  const names = new Set(pushByDefault)
  if (allRecommended) {
    for (const d of recommended) names.add(d.name)
  }

  const toPush = [...names].filter((name) => {
    if (localOnly.includes(name)) return false
    const value = vars[name]?.trim()
    return Boolean(value)
  })

  const environments = alsoPreview
    ? ['production', 'preview', 'development']
    : ['production']

  console.log('Pushing to Vercel:', environments.join(', '))
  console.log('Variables:', toPush.join(', '))
  console.log('')

  let failed = 0
  for (const name of toPush) {
    const value = vars[name].trim()
    for (const env of environments) {
      process.stdout.write(`  ${name} [${env}] ... `)
      const ok = vercelEnvAdd(name, value, env)
      console.log(ok ? 'OK' : 'FAILED')
      if (!ok) failed += 1
    }
  }

  console.log('')
  if (failed) {
    console.error(`Finished with ${failed} failure(s). Fix Vercel CLI auth/link and retry.`)
    process.exit(1)
  }

  console.log('Done. Trigger a redeploy for Production:')
  console.log('  Vercel → Deployments → ⋯ → Redeploy')
  console.log('  or: npx vercel --prod')
  console.log('')
  console.log('Dashboard mapping checklist:')
  for (const d of requiredForProduction) {
    console.log(`  [required] ${d.name} — ${d.description}`)
  }
  console.log('Optional: npm run vercel:env-push -- --preview --all-recommended')
}

main()
