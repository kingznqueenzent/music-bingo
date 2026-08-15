export type SfxPresetId = 'airhorn' | 'rewind' | 'laser' | 'crowd_cheer' | 'drumroll'

export type SfxPreset = {
  id: SfxPresetId
  label: string
  emoji: string
}

export const SFX_PRESETS: SfxPreset[] = [
  { id: 'airhorn', label: 'Airhorn', emoji: '📣' },
  { id: 'rewind', label: 'Rewind', emoji: '⏪' },
  { id: 'laser', label: 'Laser', emoji: '🔫' },
  { id: 'crowd_cheer', label: 'Crowd Cheer', emoji: '🎉' },
  { id: 'drumroll', label: 'Drumroll', emoji: '🥁' },
]

export function sfxPresetLabel(id: SfxPresetId): string {
  return SFX_PRESETS.find((p) => p.id === id)?.label ?? id
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    const ctx = new Ctx()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function applyGain(ctx: AudioContext, volume: number, start: number, attack = 0.01, release = 0.3): GainNode {
  const gain = ctx.createGain()
  const peak = Math.max(0.0001, Math.min(1, volume))
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + release)
  gain.connect(ctx.destination)
  return gain
}

function playAirhorn(ctx: AudioContext, volume: number): number {
  const now = ctx.currentTime
  const duration = 0.55
  const osc = ctx.createOscillator()
  const gain = applyGain(ctx, volume * 0.35, now, 0.005, duration)
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(180, now)
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.25)
  osc.connect(gain)
  osc.start(now)
  osc.stop(now + duration)

  const noise = ctx.createBufferSource()
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4
  noise.buffer = buffer
  const noiseGain = applyGain(ctx, volume * 0.2, now, 0.002, 0.15)
  noise.connect(noiseGain)
  noise.start(now)
  noise.stop(now + 0.15)
  return duration * 1000 + 50
}

function playRewind(ctx: AudioContext, volume: number): number {
  const now = ctx.currentTime
  const duration = 0.7
  const osc = ctx.createOscillator()
  const gain = applyGain(ctx, volume * 0.25, now, 0.01, duration)
  osc.type = 'square'
  osc.frequency.setValueAtTime(880, now)
  osc.frequency.exponentialRampToValueAtTime(110, now + duration - 0.05)
  osc.connect(gain)
  osc.start(now)
  osc.stop(now + duration)
  return duration * 1000 + 50
}

function playLaser(ctx: AudioContext, volume: number): number {
  const now = ctx.currentTime
  const duration = 0.35
  const osc = ctx.createOscillator()
  const gain = applyGain(ctx, volume * 0.3, now, 0.002, duration)
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(2200, now)
  osc.frequency.exponentialRampToValueAtTime(180, now + duration - 0.02)
  osc.connect(gain)
  osc.start(now)
  osc.stop(now + duration)
  return duration * 1000 + 50
}

function playCrowdCheer(ctx: AudioContext, volume: number): number {
  const now = ctx.currentTime
  const duration = 1.1
  const noise = ctx.createBufferSource()
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    const env = 1 - i / data.length
    data[i] = (Math.random() * 2 - 1) * env * 0.55
  }
  noise.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1200
  filter.Q.value = 0.6
  const gain = applyGain(ctx, volume * 0.28, now, 0.08, duration)
  noise.connect(filter)
  filter.connect(gain)
  noise.start(now)
  noise.stop(now + duration)
  return duration * 1000 + 50
}

function playDrumroll(ctx: AudioContext, volume: number): number {
  const now = ctx.currentTime
  const hits = 14
  const gap = 0.055
  for (let i = 0; i < hits; i++) {
    const t = now + i * gap
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = 180 + i * 8
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.22), t + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.05)
  }
  return hits * gap * 1000 + 100
}

/** Synthesized preset playback — returns approximate duration in ms. */
export function playSfxPreset(presetId: SfxPresetId, volume = 0.8): number {
  const ctx = getAudioContext()
  if (!ctx) return 800
  const v = Math.max(0, Math.min(1, volume))
  let ms = 800
  switch (presetId) {
    case 'airhorn':
      ms = playAirhorn(ctx, v)
      break
    case 'rewind':
      ms = playRewind(ctx, v)
      break
    case 'laser':
      ms = playLaser(ctx, v)
      break
    case 'crowd_cheer':
      ms = playCrowdCheer(ctx, v)
      break
    case 'drumroll':
      ms = playDrumroll(ctx, v)
      break
  }
  window.setTimeout(() => void ctx.close(), ms + 100)
  return ms
}

export function isSfxPresetId(value: string): value is SfxPresetId {
  return SFX_PRESETS.some((p) => p.id === value)
}
