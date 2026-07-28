'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChatMessage, ChatRoom, CommunityChannel } from '@/lib/supabase/types'
import { useFeatureFlags } from '@/components/FeatureFlagsProvider'

function isAdminAppMetadata(user: { app_metadata?: Record<string, unknown> } | null): boolean {
  return (user?.app_metadata as { role?: string } | undefined)?.role === 'admin'
}

const POLL_FALLBACK_MS = 8000
const REACTIONS = ['🔥', '🎵', '👑']

export type ChatIdentity = {
  playerName: string
  playerEmail: string
  playerIdentifier: string
  avatarUrl?: string | null
}

export function ChatPanel({
  room,
  gameId,
  tournamentId,
  communityChannel = 'general',
  identity,
  title,
  /** When set, skip fixed mobile bar — use inside tabs or full pages */
  embedded = false,
}: {
  room: ChatRoom
  gameId?: string | null
  tournamentId?: string | null
  communityChannel?: CommunityChannel
  identity: ChatIdentity
  title: string
  embedded?: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const { isEnabled, loading: flagsLoading } = useFeatureFlags()
  const chatOn = !flagsLoading && isEnabled('community_chat')

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const [expanded, setExpanded] = useState(embedded)
  const [lastViewedId, setLastViewedId] = useState<string | null>(null)
  const [realtimeOk, setRealtimeOk] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const query = useMemo(() => {
    const p = new URLSearchParams()
    p.set('room', room)
    p.set('limit', '50')
    if (gameId) p.set('gameId', gameId)
    if (tournamentId) p.set('tournamentId', tournamentId)
    if (room === 'community') p.set('communityChannel', communityChannel)
    return p.toString()
  }, [room, gameId, tournamentId, communityChannel])

  /** Must match migration policy on realtime.messages: topic LIKE 'chat:%'. */
  const realtimeTopic = useMemo(
    () =>
      `chat:${room}:${gameId ?? '-'}:${tournamentId ?? '-'}:${communityChannel}`,
    [room, gameId, tournamentId, communityChannel]
  )

  /** Single-column filter for postgres_changes (Supabase allows one filter per subscription). */
  const postgresChangesFilter = useMemo(() => {
    if (room === 'community') {
      return `community_channel=eq.${communityChannel}`
    }
    if (room === 'tournament' && tournamentId) {
      return `tournament_id=eq.${tournamentId}`
    }
    if (gameId) {
      return `game_id=eq.${gameId}`
    }
    return null
  }, [room, gameId, tournamentId, communityChannel])

  const scrollToBottom = useCallback(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  const fetchMessages = useCallback(async () => {
    if (!chatOn) return
    const res = await fetch(`/api/chat/messages?${query}`)
    const data = (await res.json()) as { ok?: boolean; messages?: ChatMessage[] }
    if (!data.ok || !data.messages) return
    setMessages(data.messages)
  }, [chatOn, query])

  useEffect(() => {
    if (!chatOn) return
    void fetchMessages()
  }, [chatOn, fetchMessages])

  useEffect(() => {
    if (!chatOn || !postgresChangesFilter) return

    const channel = supabase
      .channel(realtimeTopic, {
        config: { private: true },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: postgresChangesFilter,
        },
        () => {
          void fetchMessages()
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeOk(true)
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeOk(false)
          if (err) console.warn('[ChatPanel] Realtime channel:', status, err?.message ?? err)
        }
      })

    return () => {
      setRealtimeOk(false)
      supabase.removeChannel(channel)
    }
  }, [chatOn, supabase, realtimeTopic, postgresChangesFilter, fetchMessages])

  useEffect(() => {
    if (!chatOn || realtimeOk) return
    const t = setInterval(() => void fetchMessages(), POLL_FALLBACK_MS)
    return () => clearInterval(t)
  }, [chatOn, realtimeOk, fetchMessages])

  useEffect(() => {
    if (expanded) {
      const last = messages[messages.length - 1]?.id ?? null
      setLastViewedId(last)
      requestAnimationFrame(scrollToBottom)
    }
  }, [expanded, messages, scrollToBottom])

  const unread = useMemo(() => {
    if (expanded || !messages.length) return 0
    if (!lastViewedId) return messages.length
    const idx = messages.findIndex((m) => m.id === lastViewedId)
    if (idx === -1) return messages.length
    return messages.length - idx - 1
  }, [messages, expanded, lastViewedId])

  async function sendMessage(messageType: 'text' | 'reaction', body: string) {
    if (!chatOn || !body.trim()) return
    setErr('')
    setSending(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token
      const djPayload = isAdminAppMetadata(session?.user ?? null)

      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          room,
          gameId: gameId ?? null,
          tournamentId: tournamentId ?? null,
          communityChannel: room === 'community' ? communityChannel : null,
          message: body.slice(0, 2000),
          messageType,
          playerName: identity.playerName,
          playerEmail: identity.playerEmail,
          playerIdentifier: identity.playerIdentifier,
          avatarUrl: identity.avatarUrl ?? null,
          isDJ: djPayload,
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!data.ok) {
        setErr(data.error ?? 'Failed to send')
        return
      }
      setInput('')
      void fetchMessages()
    } finally {
      setSending(false)
    }
  }

  if (!chatOn) return null

  const shellClass = embedded
    ? 'flex flex-col border border-white/10 bg-slate-900/95 rounded-2xl overflow-hidden shadow-xl w-full max-w-2xl mx-auto max-h-[70vh]'
    : 'flex flex-col border border-white/10 bg-slate-900/95 backdrop-blur-md overflow-hidden shadow-xl ' +
      'fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl pb-[env(safe-area-inset-bottom)] ' +
      'lg:static lg:z-0 lg:rounded-2xl lg:w-80 lg:shrink-0 lg:pb-0 lg:sticky lg:top-20 lg:self-start max-h-[calc(100vh-5rem)]'

  return (
    <div className={shellClass}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-800/80 text-left w-full shrink-0"
      >
        <span className="font-semibold text-cyan-200 text-sm">{title}</span>
        <span className="flex items-center gap-2">
          {unread > 0 && (
            <span className="rounded-full bg-rose-500 text-white text-xs font-bold px-2 py-0.5 min-w-[1.25rem] text-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
          <span className="text-slate-500 text-xs">{expanded ? '▼' : '▲'}</span>
        </span>
      </button>
      {expanded && (
        <>
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-[100px] max-h-[36vh] lg:max-h-[min(58vh,420px)]"
          >
            {messages.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No messages yet. Say hi!</p>
            ) : (
              messages.map((m) => {
                const showDj = !!(m.isDJ ?? m.is_dj)
                return (
                <div key={m.id} className="text-sm">
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <span className={`font-medium ${showDj ? 'text-amber-200' : 'text-cyan-400/90'}`}>
                      {m.player_name}
                    </span>
                    {showDj && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-950 border border-amber-400/80 shadow-sm shadow-amber-500/30"
                        title="DJ"
                      >
                        DJ
                      </span>
                    )}
                  </span>
                  {m.message_type === 'reaction' ? (
                    <span className="ml-2 text-lg">{m.message}</span>
                  ) : (
                    <span className="text-slate-200 ml-2 break-words">{m.message}</span>
                  )}
                  {m.is_flagged && (
                    <span className="ml-1 text-amber-500 text-xs" title="Flagged for review">
                      ⚑
                    </span>
                  )}
                </div>
              )})
            )}
          </div>
          <div className="p-2 border-t border-white/5 space-y-2 shrink-0">
            <div className="flex gap-1 justify-center">
              {REACTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={sending}
                  onClick={() => sendMessage('reaction', r)}
                  className="text-xl p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-50"
                  aria-label={`React ${r}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void sendMessage('text', input)
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message…"
                maxLength={2000}
                className="flex-1 rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white shrink-0"
              >
                Send
              </button>
            </form>
            {err && <p className="text-red-400 text-xs px-1">{err}</p>}
          </div>
        </>
      )}
    </div>
  )
}
