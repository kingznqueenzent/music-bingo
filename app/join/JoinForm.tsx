'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFeatureFlags } from '@/components/FeatureFlagsProvider'
import { LyricGridLogo } from '@/components/LyricGridLogo'
import { getDefaultJoinRoomCode } from '@/lib/default-room-code'

type JoinPreview = {
  venueDisplayName: string | null
  logoUrl: string | null
  brandPrimaryHex: string | null
  brandAccentHex: string | null
  brandHideLyricgrid: boolean
  entryFeeCents: number
}

export function JoinForm({ initialGameCode = getDefaultJoinRoomCode() }: { initialGameCode?: string }) {
  const router = useRouter()
  const { isEnabled, loading: flagsLoading } = useFeatureFlags()
  const whiteLabelOn = !flagsLoading && isEnabled('b2b_white_label')
  const paidEntryOn = !flagsLoading && isEnabled('paid_entry_games')

  const [gameCode, setGameCode] = useState(initialGameCode)
  const [displayName, setDisplayName] = useState('')
  const [platformId, setPlatformId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<JoinPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)

  useEffect(() => {
    const code = gameCode.trim().toUpperCase()
    if (code.length < 4) {
      setPreview(null)
      return
    }
    const t = setTimeout(async () => {
      setPreviewLoading(true)
      try {
        const res = await fetch(`/api/game-join-preview?code=${encodeURIComponent(code)}`)
        const data = (await res.json()) as {
          ok?: boolean
          game?: {
            venueDisplayName: string | null
            logoUrl: string | null
            brandPrimaryHex: string | null
            brandAccentHex: string | null
            brandHideLyricgrid: boolean
            entryFeeCents: number
          }
        }
        if (data.ok && data.game) {
          setPreview({
            venueDisplayName: data.game.venueDisplayName,
            logoUrl: data.game.logoUrl,
            brandPrimaryHex: data.game.brandPrimaryHex,
            brandAccentHex: data.game.brandAccentHex,
            brandHideLyricgrid: data.game.brandHideLyricgrid,
            entryFeeCents: data.game.entryFeeCents ?? 0,
          })
        } else setPreview(null)
      } catch {
        setPreview(null)
      } finally {
        setPreviewLoading(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [gameCode])

  useEffect(() => {
    setPaymentConfirmed(false)
  }, [gameCode])

  const primary = preview?.brandPrimaryHex?.trim() || '#00FFFF'
  const accent = preview?.brandAccentHex?.trim() || '#10b981'
  const showVenueHeader =
    whiteLabelOn && preview && (preview.venueDisplayName || preview.logoUrl || preview.brandPrimaryHex)
  const needsPayment = paidEntryOn && (preview?.entryFeeCents ?? 0) > 0
  const feeLabel = preview ? (preview.entryFeeCents / 100).toFixed(2) : '0.00'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const code = gameCode.trim().toUpperCase()
    if (!code) {
      setError('Enter the game code.')
      return
    }
    if (!displayName.trim()) {
      setError('Enter a display name.')
      return
    }
    if (needsPayment && !paymentConfirmed) {
      setError('Complete the payment step before joining.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/bingo/generate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode: code,
          username: displayName.trim(),
          playerIdentifier: platformId.trim() || undefined,
        }),
      })
      const result = (await res.json()) as { ok?: boolean; error?: string; cardId?: string; gameId?: string }
      if (!res.ok || !result.ok || !result.cardId || !result.gameId) {
        setError(result.error ?? 'Could not join game.')
        return
      }
      router.push(`/play?cardId=${result.cardId}&gameId=${result.gameId}`)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={
        showVenueHeader
          ? ({
              ['--venue-primary' as string]: primary,
              ['--venue-accent' as string]: accent,
            } as React.CSSProperties)
          : undefined
      }
    >
      {showVenueHeader && (
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          {preview?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.logoUrl} alt="" className="h-16 w-auto max-w-[200px] object-contain" />
          ) : null}
          {preview?.venueDisplayName ? (
            <p className="text-2xl font-bold" style={{ color: primary }}>
              {preview.venueDisplayName}
            </p>
          ) : null}
          {!preview?.brandHideLyricgrid && (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <LyricGridLogo size={28} />
              <span>LyricGrid</span>
            </div>
          )}
        </div>
      )}

      {!showVenueHeader && !flagsLoading && (
        <div className="flex justify-center mb-6">
          <LyricGridLogo size={48} className="text-[#00FFFF]" />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-lg mb-4 text-slate-200">Game Code</label>
          <input
            type="text"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value)}
            placeholder="ABC123"
            className="w-full p-4 text-xl rounded-2xl bg-slate-800/60 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/50"
          />
          {previewLoading && <p className="text-slate-500 text-sm mt-2">Looking up game…</p>}
        </div>
        <div>
          <label className="block text-lg mb-4 text-slate-200">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Player1"
            className="w-full p-4 text-xl rounded-2xl bg-slate-800/60 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/50"
          />
        </div>
        <div>
          <label className="block text-lg mb-4 text-slate-200">Platform username (optional)</label>
          <input
            type="text"
            value={platformId}
            onChange={(e) => setPlatformId(e.target.value)}
            placeholder="Twitch / Kick / YouTube username for BINGO"
            className="w-full p-4 rounded-2xl bg-slate-800/60 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/50"
          />
        </div>

        {needsPayment && (
          <div
            className="rounded-2xl border p-5 space-y-3"
            style={{ borderColor: `${accent}55`, backgroundColor: `${accent}0d` }}
          >
            <p className="text-slate-200 font-semibold">Entry payment</p>
            <p className="text-slate-300 text-sm">
              This game charges <span className="font-bold text-white">${feeLabel}</span> per player. The amount is added
              to the prize pool when you join.
            </p>
            <label className="flex items-center gap-3 cursor-pointer text-slate-200">
              <input
                type="checkbox"
                checked={paymentConfirmed}
                onChange={(e) => setPaymentConfirmed(e.target.checked)}
                className="h-5 w-5 rounded border-slate-500"
              />
              <span>I authorize payment of ${feeLabel} (demo — confirm to continue)</span>
            </label>
          </div>
        )}

        {error && (
          <div className="space-y-1">
            <p className="text-red-300">{error}</p>
            {(error.includes('player_identifier') || error.includes('schema cache') || error.includes('column')) && (
              <p className="text-slate-400 text-sm">
                Try again without filling &quot;Platform username&quot;, or ask the host to run the schema update in
                Supabase.
              </p>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || (needsPayment && !paymentConfirmed)}
          className="w-full rounded-full bg-emerald-500 hover:bg-emerald-400 text-xl font-semibold py-6 px-8 shadow-xl shadow-emerald-500/40 transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? 'Joining…' : '🎲 Get My Bingo Card'}
        </button>
      </form>
    </div>
  )
}
