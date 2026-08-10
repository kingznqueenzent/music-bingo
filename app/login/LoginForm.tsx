'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { AuthError } from '@supabase/supabase-js'
import { createClient, getSupabaseBrowserConfig } from '@/lib/supabase/client'
import { LyricGridLogo } from '@/components/LyricGridLogo'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { refreshAdminAuth } from '@/lib/admin-auth-store'
import { ensureHostSession } from '@/lib/ensure-host-session'
import { AuthTimeoutError, withAuthTimeout } from '@/lib/auth-timeout'

const AUTH_TIMEOUT_MS = 10_000

function friendlyAuthError(err: AuthError | Error | { message?: string } | null | undefined): string {
  if (!err?.message) return 'Sign-in failed. Please try again.'

  const m = err.message.toLowerCase()

  if (err instanceof AuthTimeoutError || m.includes('timed out')) {
    return 'Sign-in timed out. Check your internet connection, Supabase project status, and that NEXT_PUBLIC_SUPABASE_URL is set correctly in production.'
  }
  if (m.includes('invalid login credentials') || m.includes('invalid email or password')) {
    return 'Invalid email or password. Please try again.'
  }
  if (m.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.'
  }
  if (m.includes('cors') || m.includes('failed to fetch') || m.includes('networkerror')) {
    return 'Network or CORS error reaching Supabase. Verify NEXT_PUBLIC_SUPABASE_URL and your site URL in the Supabase dashboard.'
  }
  if (m.includes('fetch')) {
    return 'Could not reach the auth server. Check your connection and Supabase configuration.'
  }

  return err.message
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('from') || '/host'
  const supabaseConfig = useMemo(() => getSupabaseBrowserConfig(), [])
  const supabase = useMemo(() => createClient(), [])
  const { isAdmin, loading: adminLoading, ready: adminReady } = useIsAdmin()
  const redirectedRef = useRef(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabaseConfig.isConfigured) {
      const msg = `Supabase is not configured (${supabaseConfig.missing.join(', ') || 'invalid keys'}). Host login cannot run until env vars are set.`
      console.error('[LyricGrid login]', msg)
      setConfigError(msg)
      return
    }
    console.log('[LyricGrid login] Supabase client ready:', supabaseConfig.url)
  }, [supabaseConfig])

  useEffect(() => {
    // Already-admin clients often lack admin_verified — mint cookie then hard-nav.
    // Soft replace without host-session caused login ↔ media-manager bounce loops.
    if (adminLoading || !adminReady || !isAdmin || redirectedRef.current) return
    redirectedRef.current = true
    const target = redirectTo.startsWith('/') ? redirectTo : '/host'
    console.log('[LyricGrid login] Already authenticated — ensuring host cookie then', target)
    void (async () => {
      const { ok } = await ensureHostSession()
      if (!ok) {
        redirectedRef.current = false
        return
      }
      window.location.replace(target)
    })()
  }, [adminLoading, adminReady, isAdmin, redirectTo])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!supabaseConfig.isConfigured) {
      const msg = 'Supabase environment variables are missing. Contact your administrator.'
      console.error('[LyricGrid login]', msg)
      setError(msg)
      return
    }

    setLoading(true)
    console.log('[LyricGrid login] signInWithPassword start', { email: email.trim() })

    try {
      const { data, error: signInError } = await withAuthTimeout(
        supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        }),
        AUTH_TIMEOUT_MS,
        'Supabase sign-in'
      )

      if (signInError) {
        console.error('[LyricGrid login] signInWithPassword error:', signInError.message, signInError)
        setError(friendlyAuthError(signInError))
        setLoading(false)
        return
      }

      const token = data.session?.access_token
      if (!token) {
        console.error('[LyricGrid login] No session access_token returned')
        setError('Sign-in succeeded but no session was returned. Try again.')
        setLoading(false)
        return
      }

      console.log('[LyricGrid login] signInWithPassword ok — establishing host session')

      const res = await withAuthTimeout(
        fetch('/api/auth/host-session', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }),
        AUTH_TIMEOUT_MS,
        'Host session verification'
      )

      let body: { ok?: boolean; error?: string; redirect?: string } = {}
      try {
        body = (await res.json()) as typeof body
      } catch {
        body = {}
      }

      if (!res.ok) {
        console.error('[LyricGrid login] host-session failed:', res.status, body.error)
        await supabase.auth.signOut()
        setError(body.error ?? 'Could not verify host access.')
        setLoading(false)
        return
      }

      refreshAdminAuth()
      const target = body.redirect ?? (redirectTo.startsWith('/') ? redirectTo : '/host')
      console.log('[LyricGrid login] Success — hard redirect to', target)
      // Hard navigation once after cookie write so middleware/proxy sees admin_verified.
      window.location.assign(target)
    } catch (err) {
      console.error('[LyricGrid login] Unexpected error:', err)
      setError(friendlyAuthError(err instanceof Error ? err : { message: String(err) }))
      setLoading(false)
    }
  }

  const displayError = configError ?? error

  if (adminLoading || !adminReady || isAdmin) {
    return (
      <main className="min-h-[calc(100dvh-3.5rem)] bg-[#121212] text-white flex items-center justify-center p-6">
        <p className="text-slate-400 text-sm">
          {isAdmin ? 'Opening host portal…' : 'Checking session…'}
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-[#121212] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#00FF66]/20 bg-[#1E1E1E] p-8 shadow-[0_0_48px_rgba(0,255,102,0.08)]">
          <div className="flex flex-col items-center text-center mb-8">
            <LyricGridLogo size={48} className="mb-4" />
            <p className="text-xs uppercase tracking-[0.25em] text-[#FFD700]/80 mb-2">Host Portal</p>
            <h1 className="text-2xl font-black text-[#00FF66]">Sign in to LyricGrid</h1>
            <p className="text-slate-400 text-sm mt-2">Access the host dashboard, media manager, and stage controls.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!configError}
                className="w-full rounded-xl bg-[#121212] border border-slate-600 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00FF66]/60 focus:ring-1 focus:ring-[#00FF66]/40 disabled:opacity-50"
                placeholder="you@venue.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!!configError}
                className="w-full rounded-xl bg-[#121212] border border-slate-600 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00FF66]/60 focus:ring-1 focus:ring-[#00FF66]/40 disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            {displayError ? (
              <p className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-red-300 text-sm" role="alert">
                {displayError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || !!configError}
              className="w-full rounded-full bg-gradient-to-r from-[#00FF66] to-green-400 hover:from-green-300 hover:to-[#00FF66] disabled:opacity-50 text-[#121212] font-bold py-3.5 transition-all shadow-lg shadow-[#00FF66]/20"
            >
              {loading ? 'Signing in…' : configError ? 'Login unavailable' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-500 text-xs">
            Legacy admin secret?{' '}
            <Link href="/admin-login" className="text-[#FFD700]/80 hover:text-[#FFD700] underline-offset-2 hover:underline">
              Use admin login
            </Link>
          </p>
        </div>

        <p className="text-center mt-6">
          <Link href="/lyricgrid" className="text-slate-400 hover:text-[#00FF66] text-sm transition-colors">
            ← Back to LyricGrid
          </Link>
        </p>
      </div>
    </main>
  )
}
