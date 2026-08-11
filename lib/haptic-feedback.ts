export type HapticKind = 'tap' | 'success' | 'error' | 'warning'

const VIBRATE_PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 20,
  success: [30, 20, 60],
  error: [40, 30, 40],
  warning: [18, 30, 18],
}

let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const Ctx = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    sharedAudioContext ??= new Ctx()
    if (sharedAudioContext.state === 'suspended') {
      void sharedAudioContext.resume()
    }
    return sharedAudioContext
  } catch {
    return null
  }
}

/** Short tick when Vibration API is unavailable (iOS Safari, some desktop browsers). */
function playAudioFallback(kind: HapticKind): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = kind === 'success' ? 880 : kind === 'error' ? 220 : 520
  gain.gain.value = kind === 'tap' ? 0.025 : 0.04
  osc.connect(gain)
  gain.connect(ctx.destination)

  const now = ctx.currentTime
  const duration = kind === 'tap' ? 0.025 : 0.06
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  osc.start(now)
  osc.stop(now + duration)
}

/**
 * Fire haptic feedback on mobile tile taps / bingo actions.
 * Uses `navigator.vibrate` when supported; falls back to a subtle audio tick.
 */
export function triggerHaptic(kind: HapticKind = 'tap'): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      const pattern = VIBRATE_PATTERNS[kind]
      const ok = navigator.vibrate(pattern)
      if (ok !== false) return
    } catch {
      // fall through to audio fallback
    }
  }
  playAudioFallback(kind)
}
