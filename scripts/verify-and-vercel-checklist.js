#!/usr/bin/env node
/**
 * Verify .env.local has Supabase vars and print Vercel checklist.
 * Run: node scripts/verify-and-vercel-checklist.js
 */
const fs = require('fs')
const path = require('path')

function getEnv() {
  const p = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(p)) return null
  const c = fs.readFileSync(p, 'utf8')
  const vars = {}
  for (const line of c.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m) {
      let v = m[2].trim()
      while (v.startsWith('"')) v = v.slice(1)
      while (v.endsWith('"')) v = v.slice(0, -1)
      vars[m[1]] = v
    }
  }
  return vars
}

async function main() {
  const vars = getEnv()
  if (!vars) {
    console.log('No .env.local found.')
    return
  }
  const url = vars.NEXT_PUBLIC_SUPABASE_URL
  const anon = vars.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const role = vars.SUPABASE_SERVICE_ROLE_KEY
  console.log('--- Your .env.local ---')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', url ? 'set (' + url.slice(0, 30) + '...)' : 'MISSING')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', anon ? 'set (length ' + anon.length + ')' : 'MISSING')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', role ? 'set (length ' + role.length + ')' : 'MISSING')
  if (url && anon) {
    try {
      const r = await fetch(url + '/rest/v1/', {
        headers: { apikey: anon, Authorization: 'Bearer ' + anon },
      })
      console.log('Supabase anon key test:', r.status === 200 ? 'OK' : 'Failed (status ' + r.status + ')')
    } catch (e) {
      console.log('Supabase test:', e.message)
    }
  }
  console.log('')
  console.log('--- Fix /host on Vercel (do these steps) ---')
  console.log('1. Open: https://vercel.com/dashboard → your music-bingo project')
  console.log('2. Go to: Settings → Environment Variables')
  console.log('3. Add or fix these 3 variables (use the SAME values as in .env.local):')
  console.log('   - NEXT_PUBLIC_SUPABASE_URL')
  console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY  (use the anon/public key, not service_role)')
  console.log('   - SUPABASE_SERVICE_ROLE_KEY     (use the service_role secret, not anon)')
  console.log('4. Redeploy: Deployments → ⋯ on latest → Redeploy')
  console.log('5. If you use admin login: open /admin-login first, then /host')
}

main().catch(console.error)
