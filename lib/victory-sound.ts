/** Short synthesized victory fanfare — no external asset required. */
export function playVictorySound(): void {
  if (typeof window === 'undefined') return
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + i * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.12 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.4)
    })
    window.setTimeout(() => void ctx.close(), 1200)
  } catch {
    /* ignore autoplay / audio restrictions */
  }
}
