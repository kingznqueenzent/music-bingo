'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play, X } from 'lucide-react'
import { VIDEO_GALLERY } from '@/lib/kingz/data'
import { useKingzReveal } from './useKingzGsap'

export function KingzVideoGallery() {
  const ref = useKingzReveal<HTMLElement>()
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = VIDEO_GALLERY.find((v) => v.id === activeId)

  return (
    <section ref={ref} className="kingz-section bg-[#0d0d14]" aria-labelledby="video-heading">
      <div className="kingz-container text-center mb-12">
        <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
        <h2 id="video-heading" className="kingz-heading text-3xl lg:text-4xl font-semibold text-[#D4AF37]">
          Video Highlights
        </h2>
        <p className="text-[#b0b0b0] mt-4 max-w-xl mx-auto">Cinematic recaps from weddings, galas, and live sets.</p>
      </div>

      <div className="kingz-container grid grid-cols-1 md:grid-cols-3 gap-6">
        {VIDEO_GALLERY.map((video) => (
          <button
            key={video.id}
            type="button"
            data-kingz-reveal
            onClick={() => setActiveId(video.id)}
            className="kingz-card overflow-hidden text-left group"
          >
            <div className="relative aspect-video">
              <Image
                src={video.thumbnail}
                alt={video.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-[#050505]/40 group-hover:bg-[#050505]/20 transition-colors flex items-center justify-center">
                <span className="p-4 rounded-full bg-[#D4AF37]/90 text-[#050505] group-hover:scale-110 transition-transform">
                  <Play className="h-6 w-6 fill-current" aria-hidden />
                </span>
              </div>
              <span className="absolute bottom-3 right-3 text-xs bg-[#050505]/80 px-2 py-1 rounded text-[#f5d276]">
                {video.duration}
              </span>
            </div>
            <div className="p-5">
              <h3 className="kingz-heading text-lg text-[#f5f5f5]">{video.title}</h3>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/90 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal
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
      )}
    </section>
  )
}
