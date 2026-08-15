'use client'

type VinylSpinnerProps = {
  spinning: boolean
  albumArtUrl?: string | null
  className?: string
  size?: number
}

/** Animated vinyl disc for Stage now-playing. Spins while music is active. */
export function VinylSpinner({
  spinning,
  albumArtUrl = null,
  className = '',
  size = 220,
}: VinylSpinnerProps) {
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div
        className={`absolute inset-0 rounded-full shadow-[0_0_40px_rgba(0,255,102,0.25)] ${
          spinning ? 'animate-vinyl-spin animate-vinyl-pulse' : ''
        }`}
        style={{
          background:
            'radial-gradient(circle at center, #1a1a1a 0%, #1a1a1a 18%, #0d0d0d 19%, #222 22%, #111 45%, #050505 70%, #222 85%, #0a0a0a 100%)',
          border: '3px solid rgba(0,255,102,0.35)',
        }}
      >
        <div className="absolute inset-[14%] rounded-full overflow-hidden border border-white/10 bg-[#1E1E1E]">
          {albumArtUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={albumArtUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#00FF66]/50 text-4xl">
              ♪
            </div>
          )}
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[12%] h-[12%] rounded-full bg-[#00FF66] shadow-[0_0_12px_#00FF66]" />
      </div>
    </div>
  )
}
