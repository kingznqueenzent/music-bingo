/** Probe local MP3/MP4 duration in the browser before upload. */
export function probeMediaDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const ext = file.name.split('.').pop()?.toLowerCase()
    const isVideo = ext === 'mp4' || file.type.startsWith('video/')
    const el = document.createElement(isVideo ? 'video' : 'audio')
    el.preload = 'metadata'

    const cleanup = () => URL.revokeObjectURL(url)

    el.onloadedmetadata = () => {
      cleanup()
      const seconds = el.duration
      resolve(Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null)
    }
    el.onerror = () => {
      cleanup()
      resolve(null)
    }

    el.src = url
  })
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Clip preview length for bingo (schema max 300s). */
export function defaultClipDurationSec(fileDurationSec: number | null): number {
  if (fileDurationSec == null || fileDurationSec < 1) return 35
  return Math.min(35, Math.min(fileDurationSec, 300))
}
