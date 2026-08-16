export type SfxPresetId = 'airhorn' | 'rewind' | 'laser' | 'crowd_cheer' | 'drumroll'

export type SfxPreset = {
  id: SfxPresetId
  label: string
  emoji: string
  /** Public path under /public */
  src: string
}

/**
 * Built-in DJ soundboard presets — local royalty-free-style MP3s in /public/sfx/.
 * Legacy ids (`rewind`, `laser`, `crowd_cheer`) map to vinyl-scratch / wrong-buzzer / bingo-win.
 */
export const SFX_PRESETS: SfxPreset[] = [
  { id: 'airhorn', label: 'Airhorn', emoji: '📣', src: '/sfx/airhorn.mp3' },
  { id: 'rewind', label: 'Vinyl Scratch', emoji: '⏪', src: '/sfx/vinyl-scratch.mp3' },
  { id: 'laser', label: 'Wrong Buzzer', emoji: '❌', src: '/sfx/wrong-buzzer.mp3' },
  { id: 'crowd_cheer', label: 'Bingo Win', emoji: '🏆', src: '/sfx/bingo-win.mp3' },
  { id: 'drumroll', label: 'Drumroll', emoji: '🥁', src: '/sfx/drumroll.mp3' },
]

const PRESET_BY_ID = Object.fromEntries(SFX_PRESETS.map((p) => [p.id, p])) as Record<
  SfxPresetId,
  SfxPreset
>

export function sfxPresetLabel(id: SfxPresetId): string {
  return PRESET_BY_ID[id]?.label ?? id
}

export function sfxPresetSrc(id: SfxPresetId): string {
  return PRESET_BY_ID[id]?.src ?? `/sfx/${id}.mp3`
}

export function isSfxPresetId(value: string): value is SfxPresetId {
  return value in PRESET_BY_ID
}

/** Approximate clip lengths for UI bounce timing (ms). */
export const SFX_PRESET_DURATION_MS: Record<SfxPresetId, number> = {
  airhorn: 900,
  rewind: 800,
  laser: 600,
  crowd_cheer: 1400,
  drumroll: 1300,
}
