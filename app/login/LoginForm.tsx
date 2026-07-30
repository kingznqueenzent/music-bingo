'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LyricGridLogo } from '@/components/LyricGridLogo'
import { useIsAdmin } from '@/hooks/useIsAdmin'

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials') || m.includes('invalid email or password')) {
    return 'Invalid email or password. Please try again.'
  }
  if (m.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.'
  }
  return message
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('from') || '/host'
  const supabase = useMemo(() => createClient(), [])
  const { isAdmin, loading: adminLoading } = useIsAdmin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      router.replace(redirectTo.startsWith('/') ? redirectTo : '/host')
    }
  }, [adminLoading, isAdmin, redirectTo, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        setError(friendlyAuthError(signInError.message))
        setLoading(false)
        return
      }

      const token = data.session?.access_token
      if (!token) {
        setError('Sign-in succeeded but no session was returned. Try again.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/auth/host-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = (await res.json()) as { ok?: boolean; error?: string; redirect?: string }

      if (!res.ok) {
        await supabase.auth.signOut()
        setError(body.error ?? 'Could not verify host access.')
        setLoading(false)
        return
      }

      router.push(body.redirect ?? redirectTo)
      router.refresh()
    } catch {
      setError('Something went wrong. Check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-3rem)] bg-[#121212] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#00FFFF]/20 bg-[#1E1E1E] p-8 shadow-[0_0_48px_rgba(0,255,255,0.08)]">
          <div className="flex flex-col items-center text-center mb-8">
            <LyricGridLogo size={48} className="mb-4" />
            <p className="text-xs uppercase tracking-[0.25em] text-[#FFD700]/80 mb-2">Host Portal</p>
            <h1 className="text-2xl font-black text-[#00FFFF]">Sign in to LyricGrid</h1>
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
                className="w-full rounded-xl bg-[#121212] border border-slate-600 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00FFFF]/60 focus:ring-1 focus:ring-[#00FFFF]/40"
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
                className="w-full rounded-xl bg-[#121212] border border-slate-600 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00FFFF]/60 focus:ring-1 focus:ring-[#00FFFF]/40"
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-red-300 text-sm" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || adminLoading}
              className="w-full rounded-full bg-gradient-to-r from-[#00FFFF] to-cyan-400 hover:from-cyan-300 hover:to-[#00FFFF] disabled:opacity-50 text-[#121212] font-bold py-3.5 transition-all shadow-lg shadow-[#00FFFF]/20"
            >
              {loading ? 'Signing in…' : 'Sign In'}
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
          <Link href="/lyricgrid" className="text-slate-400 hover:text-[#00FFFF] text-sm transition-colors">
            ← Back to LyricGrid
          </Link>
        </p>
      </div>
    </main>
  )
}
