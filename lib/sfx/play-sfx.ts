import { isSfxPresetId, playSfxPreset, sfxPresetLabel, type SfxPresetId } from '@/lib/sfx/sfx-presets'

export const SFX_VOLUME_STORAGE_KEY = 'lyricgrid-sfx-volume'

export function readSfxVolume(): number {
  if (typeof window === 'undefined') return 0.8
  const raw = window.localStorage.getItem(SFX_VOLUME_STORAGE_KEY)
  const n = raw != null ? Number(raw) : 0.8
  if (!Number.isFinite(n)) return 0.8
  return Math.max(0, Math.min(1, n))
}

export function writeSfxVolume(volume: number): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SFX_VOLUME_STORAGE_KEY, String(Math.max(0, Math.min(1, volume))))
}

let activeCustomAudio: HTMLAudioElement | null = null

export type PlaySoundEffectInput = {
  presetId?: string
  url?: string
  name?: string
  volume?: number
}

export type PlaySoundEffectResult = {
  label: string
  durationMs: number
}

/** Play a preset (Web Audio) or custom clip (HTMLAudioElement). */
export function playSoundEffect(input: PlaySoundEffectInput): PlaySoundEffectResult {
  const volume = input.volume ?? readSfxVolume()

  if (input.presetId && isSfxPresetId(input.presetId)) {
    const durationMs = playSfxPreset(input.presetId, volume)
    return { label: input.name ?? sfxPresetLabel(input.presetId), durationMs }
  }

  if (input.url) {
    try {
      if (activeCustomAudio) {
        activeCustomAudio.pause()
        activeCustomAudio = null
      }
      const audio = new Audio(input.url)
      audio.volume = Math.max(0, Math.min(1, volume))
      activeCustomAudio = audio
      void audio.play()
      return { label: input.name ?? 'SFX', durationMs: 1200 }
    } catch {
      return { label: input.name ?? 'SFX', durationMs: 800 }
    }
  }

  return { label: input.name ?? 'SFX', durationMs: 800 }
}

export type { SfxPresetId }
