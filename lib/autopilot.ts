/** Host Autopilot — unattended track calls using the same play-next engine as the Next button. */

export const AUTOPILOT_DELAYS = [3, 5, 10, 15] as const
export const AUTOPILOT_RUNTIMES = ['until_end', 30, 45, 60, 75, 90] as const
export const DEFAULT_AUTOPILOT_DELAY = 10

export type AutopilotMode = 'continue' | 'random'
export type AutopilotRuntime = (typeof AUTOPILOT_RUNTIMES)[number]
export type AutopilotDelaySec = (typeof AUTOPILOT_DELAYS)[number]
export type AutopilotWinnerPolicy = 'pause' | 'continue' | 'end_game'
export type AutopilotPhase = 'idle' | 'active' | 'paused' | 'complete' | 'stopped'
export type AutopilotPauseReason =
  | 'user'
  | 'manual_track'
  | 'bingo_claim'
  | 'winner'
  | 'disconnect'
  | 'refresh'
  | 'runtime'

export type AutopilotPersisted = {
  enabled: boolean
  mode: AutopilotMode
  runtime: AutopilotRuntime
  runtimeEndsAt: string | null
  startedAt: string | null
  delaySec: AutopilotDelaySec
  paused: boolean
  pauseReason?: AutopilotPauseReason | null
  remainingTrackIds: string[]
  winnerPolicy: AutopilotWinnerPolicy
  complete: boolean
}

export const EMPTY_AUTOPILOT: AutopilotPersisted = {
  enabled: false,
  mode: 'continue',
  runtime: 'until_end',
  runtimeEndsAt: null,
  startedAt: null,
  delaySec: DEFAULT_AUTOPILOT_DELAY,
  paused: false,
  pauseReason: null,
  remainingTrackIds: [],
  winnerPolicy: 'pause',
  complete: false,
}

export function shuffleIds(ids: string[]): string[] {
  const a = [...ids]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function remainingUncalledIds(songIdsInOrder: string[], playedIds: Iterable<string>): string[] {
  const played = playedIds instanceof Set ? playedIds : new Set(playedIds)
  return songIdsInOrder.filter((id) => !played.has(id))
}

/**
 * CONTINUE: playlist position order, skipping already-called tracks.
 * RANDOM: keep a persisted shuffle of remaining uncalled ids (never reshuffle on refresh).
 */
export function buildRemainingOrder(
  mode: AutopilotMode,
  songsInPositionOrder: { id: string }[],
  playedIds: Iterable<string>,
  persistedOrder?: string[] | null,
  seedShuffle = false
): string[] {
  const uncalled = remainingUncalledIds(
    songsInPositionOrder.map((s) => s.id),
    playedIds
  )
  if (mode === 'continue') return uncalled

  if (persistedOrder && persistedOrder.length > 0 && !seedShuffle) {
    const allowed = new Set(uncalled)
    return persistedOrder.filter((id) => allowed.has(id))
  }
  return shuffleIds(uncalled)
}

export function pickNextTrackId(remaining: string[]): string | null {
  return remaining[0] ?? null
}

export function computeRuntimeEndsAt(runtime: AutopilotRuntime, from = new Date()): string | null {
  if (runtime === 'until_end') return null
  return new Date(from.getTime() + runtime * 60_000).toISOString()
}

export function isRuntimeExpired(runtimeEndsAt: string | null, now = Date.now()): boolean {
  if (!runtimeEndsAt) return false
  const t = Date.parse(runtimeEndsAt)
  return Number.isFinite(t) && now >= t
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function runtimeLabel(runtime: AutopilotRuntime): string {
  return runtime === 'until_end' ? 'Until Game Ends' : `${runtime} min`
}

export function phaseFromState(state: AutopilotPersisted): AutopilotPhase {
  if (state.complete) return 'complete'
  if (!state.enabled) return state.startedAt ? 'stopped' : 'idle'
  if (state.paused) return 'paused'
  return 'active'
}

function asMode(v: unknown): AutopilotMode {
  return v === 'random' ? 'random' : 'continue'
}

function asRuntime(v: unknown): AutopilotRuntime {
  if (v === 30 || v === 45 || v === 60 || v === 75 || v === 90) return v
  if (v === '30' || v === '45' || v === '60' || v === '75' || v === '90') {
    return Number(v) as AutopilotRuntime
  }
  return 'until_end'
}

function asDelay(v: unknown): AutopilotDelaySec {
  if (v === 3 || v === 5 || v === 10 || v === 15) return v
  if (v === '3' || v === '5' || v === '10' || v === '15') return Number(v) as AutopilotDelaySec
  return DEFAULT_AUTOPILOT_DELAY
}

function asWinnerPolicy(v: unknown): AutopilotWinnerPolicy {
  if (v === 'continue' || v === 'end_game') return v
  return 'pause'
}

export function parseAutopilot(raw: unknown): AutopilotPersisted {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_AUTOPILOT }
  const o = raw as Record<string, unknown>
  const remaining = Array.isArray(o.remainingTrackIds)
    ? o.remainingTrackIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : []
  return {
    enabled: o.enabled === true,
    mode: asMode(o.mode),
    runtime: asRuntime(o.runtime),
    runtimeEndsAt: typeof o.runtimeEndsAt === 'string' ? o.runtimeEndsAt : null,
    startedAt: typeof o.startedAt === 'string' ? o.startedAt : null,
    delaySec: asDelay(o.delaySec),
    paused: o.paused === true,
    pauseReason:
      typeof o.pauseReason === 'string' ? (o.pauseReason as AutopilotPauseReason) : null,
    remainingTrackIds: remaining,
    winnerPolicy: asWinnerPolicy(o.winnerPolicy),
    complete: o.complete === true,
  }
}

/** Refresh cannot reconstruct an in-flight countdown — recover PAUSED, never guess. */
export function recoverAutopilotOnLoad(state: AutopilotPersisted): AutopilotPersisted {
  if (state.complete) return { ...state, enabled: false, paused: true, pauseReason: state.pauseReason ?? 'runtime' }
  if (!state.enabled) return { ...state, paused: false }
  return {
    ...state,
    paused: true,
    pauseReason: 'refresh',
  }
}

export function stoppedAutopilot(prev: AutopilotPersisted): AutopilotPersisted {
  return {
    ...prev,
    enabled: false,
    paused: false,
    pauseReason: null,
    complete: false,
    runtimeEndsAt: null,
  }
}

export function completedAutopilot(prev: AutopilotPersisted): AutopilotPersisted {
  return {
    ...prev,
    enabled: false,
    paused: true,
    complete: true,
    pauseReason: 'runtime',
  }
}
