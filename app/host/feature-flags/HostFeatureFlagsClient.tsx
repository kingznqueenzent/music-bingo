'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { FeatureFlagRow } from '@/lib/feature-flags'

export function HostFeatureFlagsClient() {
  const supabase = useMemo(() => createClient(), [])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<FeatureFlagRow[]>([])
  const [error, setError] = useState('')
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin-session')
      .then((r) => r.json())
      .then((d: { isAdmin?: boolean }) => setIsAdmin(!!d?.isAdmin))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    supabase
      .from('feature_flags')
      .select('key, label, enabled, description')
      .order('key')
      .then(({ data, error: qErr }) => {
        if (cancelled) return
        if (qErr) setError(qErr.message)
        else setRows((data ?? []) as FeatureFlagRow[])
      })
    return () => {
      cancelled = true
    }
  }, [isAdmin, supabase])

  async function toggle(key: string, enabled: boolean) {
    setPending(key)
    setError('')
    try {
      const res = await fetch('/api/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!data.ok) {
        setError(data.error ?? 'Update failed')
        return
      }
      setRows((prev) => prev.map((r) => (r.key === key ? { ...r, enabled } : r)))
    } catch (e) {
      setError(String(e))
    } finally {
      setPending(null)
    }
  }

  if (loading) {
    return <p className="text-slate-400">Loading…</p>
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-8 text-slate-300">
        <p className="mb-4">Admin login required.</p>
        <Link href="/admin-login" className="text-amber-400 hover:text-amber-300">
          Admin login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <p className="text-slate-400 text-sm">
        Toggle product areas for LyricGrid. Changes apply immediately for all users (nav and gated UI refresh via
        realtime).
      </p>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.key}
            className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">{r.label}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{r.key}</p>
              <p className="text-sm text-slate-400 mt-2">{r.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={r.enabled}
              disabled={pending === r.key}
              onClick={() => toggle(r.key, !r.enabled)}
              className={`shrink-0 relative inline-flex h-8 w-14 rounded-full transition-colors ${
                r.enabled ? 'bg-emerald-500' : 'bg-slate-600'
              } disabled:opacity-50`}
            >
              <span
                className={`pointer-events-none inline-block h-7 w-7 rounded-full bg-white shadow mt-0.5 transition translate-x-0.5 ${
                  r.enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
