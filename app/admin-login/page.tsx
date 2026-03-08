'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/host'
  const [email, setEmail] = useState('')
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, secret, from }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? 'Invalid credentials')
        setLoading(false)
        return
      }
      router.push(data.redirect ?? from)
      router.refresh()
    } catch {
      setError('Request failed')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Admin login</h1>
        <p className="text-slate-400 text-sm mb-6">
          Only the configured admin email can access Host and Media Manager.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl bg-slate-800 border border-slate-600 px-4 py-3 text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label htmlFor="secret" className="block text-sm font-medium text-slate-300 mb-1">
              Secret
            </label>
            <input
              id="secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              required
              className="w-full rounded-xl bg-slate-800 border border-slate-600 px-4 py-3 text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 py-3 font-semibold text-white transition-colors"
          >
            {loading ? 'Checking…' : 'Log in'}
          </button>
        </form>
        <p className="mt-6 text-center">
          <a href="/join" className="text-slate-400 hover:text-white text-sm">
            ← Back to Join
          </a>
        </p>
      </div>
    </main>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading…</p>
      </main>
    }>
      <AdminLoginForm />
    </Suspense>
  )
}
