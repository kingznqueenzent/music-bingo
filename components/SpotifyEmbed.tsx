'use client'

interface SpotifyEmbedProps {
  trackId: string
  albumArtUrl?: string | null
  title?: string | null
  className?: string
}

/**
 * Embeds a Spotify track. The Spotify iframe does not support clip length or
 * crossfade; it plays the full track. Crossfade logic applies to YouTube and
 * local file playback only.
 */
export function SpotifyEmbed({ trackId, albumArtUrl, title, className = '' }: SpotifyEmbedProps) {
  const embedSrc = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`
  return (
    <div className={className}>
      {(albumArtUrl || title) && (
        <div className="flex items-center gap-4 mb-4">
          {albumArtUrl && (
            <img
              src={albumArtUrl}
              alt=""
              className="w-24 h-24 rounded-xl object-cover shrink-0 shadow-lg"
            />
          )}
          {title && (
            <p className="text-slate-100 font-semibold text-lg truncate">{title}</p>
          )}
        </div>
      )}
      <div className="rounded-xl overflow-hidden bg-[#1db954]/10 border border-slate-700">
        <iframe
          src={embedSrc}
          width="100%"
          height="152"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={title ?? 'Spotify track'}
          className="rounded-xl"
        />
      </div>
      <p className="text-slate-500 text-xs mt-2">
        Spotify – full track (clip/crossfade not supported for Spotify)
      </p>
    </div>
  )
}
