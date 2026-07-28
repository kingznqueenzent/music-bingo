'use client'

import { useState, useEffect } from 'react'
import { KINGZ_CONTACT } from '@/lib/kingz/data'
import { useKingzReveal } from './useKingzGsap'

export function KingzLivestreams() {
  const ref = useKingzReveal<HTMLElement>()
  const [parentDomain, setParentDomain] = useState('localhost')

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
            <p className="text-[#b0b0b0] text-sm">Watch our live DJ sets and interactive broadcasts.</p>
          </div>
          <div className="aspect-video bg-[#050505]">
            <iframe
              src={`https://player.twitch.tv/?channel=kingznqueenzent&parent=${parentDomain}&muted=true`}
              title="Twitch stream — Kingz and Queenz Entertainment"
              className="w-full h-full"
              allowFullScreen
              loading="lazy"
            />
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
            <p className="text-[#b0b0b0] text-sm">Join the party on Kick — exclusive sets and community vibes.</p>
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
