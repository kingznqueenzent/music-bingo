'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, Radio, Wifi, WifiOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { gameChannelName } from '@/lib/supabase-realtime'

export type RoomHealthPanelProps = {
  gameId: string
  playerCount: number
  trackedBoards: number
  className?: string
}

type HealthState = {
  channel: 'connecting' | 'joined' | 'error' | 'closed'
  latencyMs: number | null
  lastSyncAt: number | null
}

/**
 * Subtle host diagnostics: Realtime channel state, REST RTT, active board count.
 */
export function RoomHealthPanel({
  gameId,
  playerCount,
  trackedBoards,
  className = '',
}: RoomHealthPanelProps) {
  const supabase = useMemo(() => createClient(), [])
  const [health, setHealth] = useState<HealthState>({
    channel: 'connecting',
    latencyMs: null,
    lastSyncAt: null,
  })

  useEffect(() => {
    let cancelled = false
    const channel = supabase.channel(`${gameChannelName(gameId)}-health`)

    channel.subscribe((status) => {
      if (cancelled) return
      if (status === 'SUBSCRIBED') {
        setHealth((h) => ({ ...h, channel: 'joined', lastSyncAt: Date.now() }))
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setHealth((h) => ({ ...h, channel: 'error' }))
      } else if (status === 'CLOSED') {
        setHealth((h) => ({ ...h, channel: 'closed' }))
      } else {
        setHealth((h) => ({ ...h, channel: 'connecting' }))
      }
    })

    const ping = async () => {
      const t0 = performance.now()
      try {
        const { error } = await supabase.from('games').select('id').eq('id', gameId).maybeSingle()
        if (cancelled) return
        const ms = Math.round(performance.now() - t0)
        setHealth((h) => ({
          ...h,
          latencyMs: error ? h.latencyMs : ms,
          lastSyncAt: Date.now(),
          channel: error && h.channel === 'joined' ? h.channel : h.channel,
        }))
      } catch {
        /* keep last good reading */
      }
    }

    void ping()
    const interval = window.setInterval(() => void ping(), 8000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      void supabase.removeChannel(channel)
    }
  }, [supabase, gameId])

  const latencyLabel =
    health.latencyMs == null
      ? '…'
      : health.latencyMs < 120
        ? `${health.latencyMs}ms · excellent`
        : health.latencyMs < 300
          ? `${health.latencyMs}ms · good`
          : `${health.latencyMs}ms · slow`

  const syncOk =
    health.channel === 'joined' &&
    health.latencyMs != null &&
    health.latencyMs < 500

  return (
    <div
      className={`rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 ${className}`}
      role="status"
      aria-label="Room connection health"
    >
      <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
        <Activity className="w-3.5 h-3.5 text-[#00FF66]/80" />
        Room health
      </span>

      <span className="inline-flex items-center gap-1.5">
        {health.channel === 'joined' ? (
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        ) : health.channel === 'error' ? (
          <WifiOff className="w-3.5 h-3.5 text-red-400" />
        ) : (
          <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        )}
        Socket:{' '}
        <span
          className={
            health.channel === 'joined'
              ? 'text-emerald-400'
              : health.channel === 'error'
                ? 'text-red-400'
                : 'text-amber-300'
          }
        >
          {health.channel}
        </span>
      </span>

      <span className="inline-flex items-center gap-1.5">
        Latency:{' '}
        <span
          className={
            health.latencyMs != null && health.latencyMs < 300
              ? 'text-emerald-400'
              : 'text-amber-300'
          }
        >
          {latencyLabel}
        </span>
      </span>

      <span className="inline-flex items-center gap-1.5">
        Players: <span className="text-slate-200 tabular-nums">{playerCount}</span>
        {trackedBoards > 0 ? (
          <span className="text-slate-500">· {trackedBoards} live boards</span>
        ) : null}
      </span>

      <span
        className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 border ${
          syncOk
            ? 'border-emerald-500/30 text-emerald-400'
            : 'border-amber-500/30 text-amber-300'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${syncOk ? 'bg-emerald-400' : 'bg-amber-400'}`}
        />
        {syncOk ? 'Sync healthy' : 'Sync degraded'}
      </span>
    </div>
  )
}
