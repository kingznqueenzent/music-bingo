'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play, X } from 'lucide-react'
import { VIDEO_GALLERY } from '@/lib/kingz/data'
import { useKingzReveal } from './useKingzGsap'

/**
 * Video thumbnails only when paths exist.
 * Real embeds go in VIDEO_GALLERY[].embedUrl — empty embed = Coming Soon (no blank iframe).
 */
export function KingzVideoGallery() {
  const ref = useKingzReveal<HTMLElement>()
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = VIDEO_GALLERY.find((v) => v.id === activeId)

  const open = (id: string) => {
    const video = VIDEO_GALLERY.find((v) => v.id === id)
    if (!video?.embedUrl) return
    setActiveId(id)
  }

  return (
    <section id="videos" ref={ref} className="kingz-section bg-[#0d0d14]" aria-labelledby="video-heading">
      <div className="kingz-container text-center mb-12">
        <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
        <h2 id="video-heading" className="kingz-heading text-3xl lg:text-4xl font-semibold text-[#D4AF37]">
          Video Highlights
        </h2>
        <p className="text-[#b0b0b0] mt-4 max-w-xl mx-auto">
          {VIDEO_GALLERY.some((video) => video.embedUrl)
            ? 'Cinematic recaps from weddings, galas, and live sets.'
            : 'Coming soon — performance videos will appear here. Watch us live on TikTok and YouTube in the meantime.'}
        </p>
      </div>

      <div className="kingz-container grid grid-cols-1 md:grid-cols-3 gap-6">
        {VIDEO_GALLERY.map((video) => {
          const hasEmbed = Boolean(video.embedUrl)
          return (
            <button
              key={video.id}
              type="button"
              data-kingz-reveal
              onClick={() => open(video.id)}
              disabled={!hasEmbed}
              className="kingz-card overflow-hidden text-left group disabled:cursor-default"
              aria-label={
                hasEmbed ? `Play ${video.title}` : `${video.title} — video coming soon`
              }
            >
              <div className="relative aspect-video">
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                  loading="lazy"
                  quality={70}
                />
                <div className="absolute inset-0 bg-[#050505]/40 motion-safe:group-hover:bg-[#050505]/20 transition-colors flex items-center justify-center">
                  <span className="p-4 rounded-full bg-[#D4AF37]/90 text-[#050505] transition-transform motion-safe:group-hover:scale-110">
                    <Play className="h-6 w-6 fill-current" aria-hidden />
                  </span>
                </div>
                {!hasEmbed && (
                  <span className="absolute inset-x-0 bottom-0 bg-[#050505]/85 text-center text-xs uppercase tracking-widest text-[#D4AF37] py-2">
                    Coming Soon
                  </span>
                )}
                {video.duration ? (
                  <span className="absolute bottom-3 right-3 text-xs bg-[#050505]/80 px-2 py-1 rounded text-[#f5d276]">
                    {video.duration}
                  </span>
                ) : null}
              </div>
              <div className="p-5">
                <h3 className="kingz-heading text-lg text-[#f5f5f5]">{video.title}</h3>
              </div>
            </button>
          )
        })}
      </div>

      {active?.embedUrl ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/90 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Playing: ${active.title}`}
        >
          <button
            type="button"
            onClick={() => setActiveId(null)}
            className="absolute top-6 right-6 p-2 text-[#D4AF37] hover:scale-110 transition-transform min-h-[44px] min-w-[44px]"
            aria-label="Close video"
          >
            <X className="h-8 w-8" />
          </button>
          <div className="w-full max-w-4xl aspect-video kingz-card overflow-hidden">
            <iframe
              src={active.embedUrl}
              title={active.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}
