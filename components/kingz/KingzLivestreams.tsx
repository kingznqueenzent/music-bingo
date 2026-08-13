'use client'

import { useState, useEffect } from 'react'
import { Play } from 'lucide-react'
import { KINGZ_CONTACT } from '@/lib/kingz/data'
import { useKingzReveal } from './useKingzGsap'

/**
 * Livestream section — Twitch iframe loads only after user intent (no heavy auto-download).
 */
export function KingzLivestreams() {
  const ref = useKingzReveal<HTMLElement>()
  const [loadTwitch, setLoadTwitch] = useState(false)
  const [parentDomain, setParentDomain] = useState('kingznqueenzent.ca')

  useEffect(() => {
    setParentDomain(window.location.hostname)
  }, [])

  return (
    <section id="livestreams" ref={ref} className="kingz-section" aria-labelledby="livestreams-heading">
      <div className="kingz-container text-center mb-12">
        <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
        <h2 id="livestreams-heading" className="kingz-heading text-3xl lg:text-4xl font-semibold text-[#D4AF37] mb-4">
          Live Streams
        </h2>
        <div className="kingz-deco-divider max-w-xs mx-auto" aria-hidden />
      </div>

      <div className="kingz-container grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div data-kingz-reveal className="kingz-card overflow-hidden">
          <div className="p-6 border-b border-[rgba(245,210,118,0.2)]">
            <h3 className="kingz-heading text-xl text-[#D4AF37] mb-2">Twitch</h3>
            <p className="text-[#d4d4d4] text-sm">Watch our live DJ sets and interactive broadcasts.</p>
          </div>
          <div className="aspect-video bg-[#050505] relative">
            {loadTwitch ? (
              <iframe
                src={`https://player.twitch.tv/?channel=kingznqueenzent&parent=${parentDomain}&muted=true`}
                title="Twitch stream — Kingz and Queenz Entertainment"
                className="w-full h-full"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <button
                type="button"
                onClick={() => setLoadTwitch(true)}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#5A2D91]/25 to-[#050505] text-[#f5f5f5] hover:from-[#5A2D91]/35 transition-colors touch-manipulation min-h-[44px]"
                aria-label="Load Twitch player"
              >
                <span className="p-4 rounded-full bg-[#D4AF37] text-[#050505]">
                  <Play className="h-7 w-7 fill-current" aria-hidden />
                </span>
                <span className="text-sm uppercase tracking-[0.2em] text-[#D4AF37]">Load live player</span>
              </button>
            )}
          </div>
          <div className="p-6">
            <a
              href={KINGZ_CONTACT.twitch}
              target="_blank"
              rel="noopener noreferrer"
              className="kingz-btn-outline w-full"
            >
              Follow on Twitch
            </a>
          </div>
        </div>

        <div data-kingz-reveal className="kingz-card overflow-hidden">
          <div className="p-6 border-b border-[rgba(245,210,118,0.2)]">
            <h3 className="kingz-heading text-xl text-[#D4AF37] mb-2">Kick</h3>
            <p className="text-[#d4d4d4] text-sm">Join the party on Kick — exclusive sets and community vibes.</p>
          </div>
          <div className="aspect-video bg-[#050505] flex items-center justify-center p-8">
            <div className="text-center">
              <p className="text-[#d4d4d4] mb-6">
                Kick embed loads on their platform. Click below to watch live.
              </p>
              <a
                href={KINGZ_CONTACT.kick}
                target="_blank"
                rel="noopener noreferrer"
                className="kingz-btn-gold"
              >
                Watch on Kick
              </a>
            </div>
          </div>
          <div className="p-6">
            <a
              href={KINGZ_CONTACT.kick}
              target="_blank"
              rel="noopener noreferrer"
              className="kingz-btn-outline w-full"
            >
              Follow on Kick
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
