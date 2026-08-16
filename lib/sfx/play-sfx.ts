import {
  isSfxPresetId,
  SFX_PRESET_DURATION_MS,
  sfxPresetLabel,
  sfxPresetSrc,
  SFX_PRESETS,
  type SfxPresetId,
} from '@/lib/sfx/sfx-presets'

export const SFX_VOLUME_STORAGE_KEY = 'lyricgrid-sfx-volume'

/** SFX sit slightly under bed music so they don't clip the game track. */
export const SFX_GAIN = 0.82

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

const preloadPool = new Map<string, HTMLAudioElement>()
let preloaded = false

function makeAudio(src: string): HTMLAudioElement {
  const audio = new Audio(src)
  audio.preload = 'auto'
  audio.crossOrigin = 'anonymous'
  return audio
}

/** Warm HTML5 audio elements so the first host click is low-latency. */
export function preloadSfxAssets(): void {
  if (typeof window === 'undefined' || preloaded) return
  preloaded = true
  for (const preset of SFX_PRESETS) {
    if (preloadPool.has(preset.id)) continue
    const audio = makeAudio(preset.src)
    void audio.load()
    preloadPool.set(preset.id, audio)
  }
}

function effectiveVolume(volume: number): number {
  return Math.max(0, Math.min(1, volume)) * SFX_GAIN
}

/**
 * Play a built-in preset from /public/sfx via HTML5 Audio.
 * Clones a preloaded element so overlapping triggers don't cut each other off,
 * and never touches the host GameClipPlayer / track audio graph.
 */
export function playSfxPreset(presetId: SfxPresetId, volume = 0.8): number {
  if (typeof window === 'undefined') return SFX_PRESET_DURATION_MS[presetId]
  preloadSfxAssets()

  const src = sfxPresetSrc(presetId)
  const template = preloadPool.get(presetId) ?? makeAudio(src)
  if (!preloadPool.has(presetId)) preloadPool.set(presetId, template)

  const audio = template.cloneNode(true) as HTMLAudioElement
  audio.volume = effectiveVolume(volume)
  audio.currentTime = 0
  const playPromise = audio.play()
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch((err) => console.error('[sfx] preset play error:', presetId, err))
  }

  return SFX_PRESET_DURATION_MS[presetId] ?? 1000
}

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

/**
 * Play a preset MP3 or custom uploaded clip.
 * Custom clips use a one-shot Audio element (does not pause bed music).
 */
export function playSoundEffect(input: PlaySoundEffectInput): PlaySoundEffectResult {
  const volume = input.volume ?? readSfxVolume()

  if (input.presetId && isSfxPresetId(input.presetId)) {
    const durationMs = playSfxPreset(input.presetId, volume)
    return { label: input.name ?? sfxPresetLabel(input.presetId), durationMs }
  }

  if (input.url) {
    try {
      const audio = makeAudio(input.url)
      audio.volume = effectiveVolume(volume)
      const playPromise = audio.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => console.error('[sfx] custom play error:', input.url, err))
      }
      return { label: input.name ?? 'SFX', durationMs: 1500 }
    } catch (err) {
      console.error('[sfx] custom create error:', err)
      return { label: input.name ?? 'SFX', durationMs: 800 }
    }
  }

  return { label: input.name ?? 'SFX', durationMs: 800 }
}

export type { SfxPresetId }
