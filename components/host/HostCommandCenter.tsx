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
    <section className="lg-surface-card rounded-2xl p-6 md:p-8 max-w-2xl w-full mb-8 shadow-[0_0_32px_rgba(0,255,255,0.06)]">
      <h2 className="text-xl font-bold text-[var(--lg-neon)] mb-1">Host command center</h2>
      <p className="text-white/45 text-sm mb-6">
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
              className="rounded-full bg-[var(--lg-neon)]/15 border border-[var(--lg-neon)]/40 text-[var(--lg-neon)] hover:bg-[var(--lg-neon)]/25 px-4 py-2 text-sm font-semibold"
            >
              Generate 6-character code
            </button>
            {joinCode ? (
              <>
                <span className="font-mono text-2xl font-black tracking-widest text-white">{joinCode}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60 hover:border-[var(--lg-neon)]/40"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </>
            ) : null}
          </div>
          <p className="text-white/35 text-xs mt-2">
            Use this when creating a custom game, or share with players at{' '}
            <Link href="/join" className="text-[var(--lg-neon)]/80 hover:underline">
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
                    : 'bg-[var(--lg-canvas)] text-white/60 hover:bg-white/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-white/35 text-xs mt-2">
            Selected pattern: <strong className="text-white/70">{pattern}</strong> — applied when you start a game
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
              className="flex-1 min-w-[200px] rounded-xl lg-neon-input px-3 py-2 text-sm placeholder-white/35"
            />
            <Link
              href={verifyHref}
              className="rounded-full lg-neon-btn px-5 py-2 text-sm"
            >
              Open verifier
            </Link>
          </div>
          <p className="text-white/35 text-xs mt-2">
            Paste a card ID from a BINGO claim, then verify marks in your active host game dashboard.
          </p>
        </div>
      </div>
    </section>
  )
}
