'use client'

type Source = 'youtube' | 'spotify' | 'local'

/** Small glowing icon for the active track source (YouTube, Spotify, MP3/MP4). */
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
    spotify: { bg: 'bg-[#1DB954]/90', color: 'text-emerald-200', label: 'Spotify' },
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
      {source === 'spotify' && (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
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
