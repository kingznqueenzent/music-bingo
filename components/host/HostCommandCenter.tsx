'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { WinPattern } from '@/lib/bingo-win-pattern'

const PATTERNS: { value: WinPattern; label: string }[] = [
  { value: 'line', label: 'Single Line' },
  { value: 'corners', label: 'Four Corners' },
  { value: 'x', label: 'X-Pattern' },
  { value: 'blackout', label: 'Blackout' },
]

function randomJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function HostCommandCenter() {
  const [joinCode, setJoinCode] = useState('')
  const [pattern, setPattern] = useState<WinPattern>('line')
  const [verifyCardId, setVerifyCardId] = useState('')
  const [copied, setCopied] = useState(false)

  const verifyHref = useMemo(() => {
    const id = verifyCardId.trim()
    if (!id) return '/host'
    return `/host?verify=${encodeURIComponent(id)}`
  }, [verifyCardId])

  function handleGenerateCode() {
    setJoinCode(randomJoinCode())
    setCopied(false)
  }

  async function handleCopy() {
    if (!joinCode) return
    try {
      await navigator.clipboard.writeText(joinCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="rounded-2xl border border-[#00FFFF]/20 bg-[#1E1E1E]/80 p-6 md:p-8 max-w-2xl w-full mb-8 shadow-[0_0_32px_rgba(0,255,255,0.06)]">
      <h2 className="text-xl font-bold text-[#00FFFF] mb-1">Host command center</h2>
      <p className="text-slate-400 text-sm mb-6">
        Generate a join PIN, pick a default win pattern, and jump to bingo claim verification.
      </p>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-[#FFD700]/90 uppercase tracking-wide mb-2">
            Join PIN generator
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateCode}
              className="rounded-full bg-[#00FFFF]/15 border border-[#00FFFF]/40 text-[#00FFFF] hover:bg-[#00FFFF]/25 px-4 py-2 text-sm font-semibold"
            >
              Generate 6-character code
            </button>
            {joinCode ? (
              <>
                <span className="font-mono text-2xl font-black tracking-widest text-white">{joinCode}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-[#00FFFF]/40"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </>
            ) : null}
          </div>
          <p className="text-slate-500 text-xs mt-2">
            Use this when creating a custom game, or share with players at{' '}
            <Link href="/join" className="text-[#00FFFF]/80 hover:underline">
              /join
            </Link>
            .
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[#FFD700]/90 uppercase tracking-wide mb-2">
            Win pattern
          </h3>
          <div className="flex flex-wrap gap-2">
            {PATTERNS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPattern(p.value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  pattern === p.value
                    ? 'bg-[#FFD700] text-[#121212]'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-slate-500 text-xs mt-2">
            Selected pattern: <strong className="text-slate-300">{pattern}</strong> — applied when you start a game
            from the dashboard.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[#FFD700]/90 uppercase tracking-wide mb-2">
            Claim verifier
          </h3>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={verifyCardId}
              onChange={(e) => setVerifyCardId(e.target.value)}
              placeholder="Player card ID"
              className="flex-1 min-w-[200px] rounded-xl bg-[#121212] border border-slate-600 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00FFFF]/50"
            />
            <Link
              href={verifyHref}
              className="rounded-full bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-sm font-semibold text-white"
            >
              Open verifier
            </Link>
          </div>
          <p className="text-slate-500 text-xs mt-2">
            Paste a card ID from a BINGO claim, then verify marks in your active host game dashboard.
          </p>
        </div>
      </div>
    </section>
  )
}
