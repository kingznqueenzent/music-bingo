'use client'

type Source = 'youtube' | 'local'

/** Small glowing icon for the active track source (YouTube or Media Library MP3/MP4). */
export function SourceIndicator({
  source,
  className = '',
}: {
  source: Source
  className?: string
}) {
  const base = 'inline-flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm font-medium transition-all duration-300 '
  const glow = 'shadow-[0_0_12px_currentColor]'
  const styles: Record<Source, { bg: string; color: string; label: string }> = {
    youtube: { bg: 'bg-red-600/90', color: 'text-red-200', label: 'YouTube' },
    local: { bg: 'bg-slate-500/90', color: 'text-slate-200', label: 'MP3/MP4' },
  }
  const s = styles[source]
  return (
    <span
      title={s.label}
      className={`${base} ${s.bg} ${s.color} ${glow} ${className}`}
      aria-label={s.label}
    >
      {source === 'youtube' && (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      )}
      {source === 'local' && (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M9 18V5l12-2v13M9 9l12-2" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      )}
    </span>
  )
}
